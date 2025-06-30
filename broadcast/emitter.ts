import { io, Socket } from 'socket.io-client';
import { EmitMessage } from '../models/message';

let socket: Socket;

export function initializeSocket(url: string): void {
    if (socket && socket.connected) {
        console.log('Socket already initialized and connected.');
        return;
    }
    if (socket) {
        socket.disconnect();
    }
    
    socket = io(url, {
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
    });
    console.log(`Socket initialized with URL: ${url}`);

    socket.on('connect', () => {
        console.log('Playwright client connected to server');
    });

    socket.on('disconnect', (message) => {
        console.log('Playwright client disconnected from server');

    });
}

export function disconnectSocket(): void {
    if (socket) {
        socket.disconnect();
    }
}

export const emitMessage = ({
    projectId,
    status = undefined,
    test = undefined,
    eventType,
    percentage = undefined,
    error = undefined,
    errorLocation = undefined,
    duration = undefined,
    location = undefined,
    retry = undefined,
    screenshotBase64 = undefined,
    workerIndex = undefined,
    totalTests = undefined,
    startTime = undefined,
    target = undefined,
    testId = undefined,
}: EmitMessage, callback?: () => void): void => {
    const data: EmitMessage = { projectId, status, test, eventType, percentage, duration, location, retry, screenshotBase64, workerIndex, totalTests, startTime, target, testId };
    if (error) {
        data.error = error;
    }
    if (errorLocation) {
        data.errorLocation = errorLocation;
    }
    if (percentage) {
        data.percentage = percentage;
    }
    if (status) {
        data.status = status;
    }
    if (test) {
        data.test = test;
    }

    if (duration) {
        data.duration = duration;
    }

    if (location) {
        data.location = location;
    }

    if (retry) {
        data.retry = retry;
    }

    if (screenshotBase64) {
        data.screenshotBase64 = screenshotBase64;
    }

    if (workerIndex) {
        data.workerIndex = workerIndex;
    }

    if (totalTests) {
        data.totalTests = totalTests;
    }

    if (startTime) {
        data.startTime = startTime;
    }

    if (target) {
        data.target = target;
    }
    
    if (testId) {
        data.testId = testId;
    }
    socket.emit('testUpdate', data, callback);
};
