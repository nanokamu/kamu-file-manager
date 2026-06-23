import { BadRequestException } from '@nestjs/common';
import { Transform } from 'stream';

export interface UploadSizeLimits {
  maxBytes: number;
  expectedBytes?: number;
}

export function validateUploadSizeHeaders(
  contentLength: string | string[] | undefined,
  limits: UploadSizeLimits,
): void {
  const { maxBytes, expectedBytes } = limits;

  if (expectedBytes !== undefined) {
    if (!Number.isFinite(expectedBytes) || expectedBytes < 0) {
      throw new BadRequestException('Invalid declared size');
    }
    if (expectedBytes > maxBytes) {
      throw new BadRequestException(
        `Declared size exceeds maximum upload size of ${maxBytes} bytes`,
      );
    }
  }

  const headerValue = Array.isArray(contentLength)
    ? contentLength[0]
    : contentLength;

  if (headerValue === undefined) {
    return;
  }

  const length = Number(headerValue);
  if (!Number.isFinite(length) || length < 0) {
    throw new BadRequestException('Invalid Content-Length header');
  }
  if (length > maxBytes) {
    throw new BadRequestException(
      `Content-Length exceeds maximum upload size of ${maxBytes} bytes`,
    );
  }
  if (expectedBytes !== undefined && length !== expectedBytes) {
    throw new BadRequestException(
      `Content-Length (${length}) does not match declared size (${expectedBytes})`,
    );
  }
}

export function createUploadSizeValidator(limits: UploadSizeLimits): Transform {
  let received = 0;

  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;

      if (received > limits.maxBytes) {
        callback(
          new BadRequestException(
            `Upload exceeds maximum size of ${limits.maxBytes} bytes`,
          ),
        );
        return;
      }

      if (
        limits.expectedBytes !== undefined &&
        received > limits.expectedBytes
      ) {
        callback(
          new BadRequestException(
            `Upload exceeds declared size of ${limits.expectedBytes} bytes`,
          ),
        );
        return;
      }

      callback(null, chunk);
    },
    flush(callback) {
      if (
        limits.expectedBytes !== undefined &&
        received !== limits.expectedBytes
      ) {
        callback(
          new BadRequestException(
            `Uploaded size mismatch: expected ${limits.expectedBytes}, got ${received}`,
          ),
        );
        return;
      }

      callback();
    },
  });
}
