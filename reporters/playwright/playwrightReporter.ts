// playwright_reporter.ts
import { Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { disconnectSocket, emitMessage, initializeSocket } from '../../broadcast/emitter';
import { MessageTypes } from '../../constants/messageTypes';


type PigeonReporterOptions = {
    liveReportingSocketEndpoint: string;
    projectId: string;
    // send screenshot flag defaulted to true
    sendScreenshots?: boolean;
};

class PigeonReporter implements Reporter {
    private totalTests = 0;
    private completedTests = 0;
    private pendingTestCompletionEvents: Promise<void>[] = [];
    private sendScreenshots: boolean;
    fs = require('fs');

    constructor(private options: PigeonReporterOptions) {
        this.sendScreenshots = this.options.sendScreenshots ?? true;
        console.log('Screenshots enabled:', this.options.sendScreenshots);
        initializeSocket(this.options.liveReportingSocketEndpoint);
    }

    onBegin(config: any, suite: Suite) {

        this.totalTests = suite.allTests().length;
        console.log('Test run started for project ID:', this.options.projectId);
        console.log('Total tests to run:', this.totalTests);
        emitMessage({
            projectId: this.options.projectId,
            eventType: MessageTypes.TEST_RUN_STARTED,
            percentage: 0,
            totalTests: this.totalTests,
        });
    }

    onTestBegin(test: TestCase) {
        console.log('test started:', test.title, 'in project ID:', this.options.projectId);
        emitMessage({
            projectId: this.options.projectId,
            eventType: MessageTypes.TEST_STARTED,
            test: test.title,
            location: test.location.file,
            target: (test as any)._projectId || 'unknown',
            testId: test.id,
        });
    }

    async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
        const testCompletionPromise = new Promise<void>(resolve => {
            // Use an async IIFE to allow 'await' for file operations
            (async () => {
                console.log('test completed:', test.title, 'in project ID:', this.options.projectId);
                this.completedTests++;
                const percentage = ((this.completedTests / this.totalTests) * 100).toFixed(2);
                const status = result.status;
                const error = result.status === 'failed' ? result.error?.message : undefined;
                const errorLocation =
                    result.status === 'failed' &&
                    result.error?.location?.file &&
                    result.error?.location?.line !== undefined &&
                    result.error?.location?.column !== undefined
                        ? {
                              file: result.error.location.file,
                              line: result.error.location.line,
                              column: result.error.location.column,
                          }
                        : undefined;
                let screenshotBase64: string | undefined;
                if (this.sendScreenshots) {
                    if (result.attachments) {
                        for (const attachment of result.attachments) {
                            if (attachment.contentType === 'image/png' && attachment.path) {
                                // Use async file read to avoid blocking the event loop
                                screenshotBase64 = await this.fs.promises.readFile(attachment.path, { encoding: 'base64' });
                            }
                        }
                    }
                }

                emitMessage({
                    projectId: this.options.projectId,
                    target: (test as any)._projectId || 'unknown',
                    testId: test.id,
                    eventType: MessageTypes.TEST_COMPLETED,
                    test: test.title,
                    status,
                    error,
                    errorLocation,
                    percentage: parseFloat(percentage),
                    duration: result.duration,
                    retry: result.retry,
                    screenshotBase64: screenshotBase64,
                    workerIndex: result.parallelIndex,
                    startTime: result.startTime,
                }, () => {
                    // This callback is the acknowledgment.
                    // Resolve the promise here to signal completion.
                    resolve();
                });
            })();
        });

        this.pendingTestCompletionEvents.push(testCompletionPromise);
    }

    async onEnd(): Promise<void> {
        console.log('All tests completed for project ID:', this.options.projectId);
        const percentage = ((this.completedTests / this.totalTests) * 100).toFixed(2);
        // Wait for all pending test completion events, but limit to 2 minutes max
        await Promise.race([
            Promise.all(this.pendingTestCompletionEvents),
            new Promise<void>((resolve) => setTimeout(resolve, 2 * 60 * 1000))
        ]);
        await new Promise<void>(resolve => {
            emitMessage({
                projectId: this.options.projectId,
                eventType: MessageTypes.TEST_RUN_COMPLETED,
                percentage: parseFloat(percentage),
            }, () => {
                // The final message is sent, now we can disconnect and resolve.
                disconnectSocket();
                resolve();
            });
        });
    }
}

export default PigeonReporter;
