export type EmitMessage = {
    projectId: string;
    eventType: string;
    target?: string;
    status?: string;
    test?: string;
    error?: string;
    errorLocation?: { file: string; line: number; column: number };
    percentage?: number;
    duration?: number;
    location?: string;
    retry?: number;
    screenshotBase64?: string;
    workerIndex?: number;
    totalTests?: number;
    startTime?: Date;
    testId?: string;
};
