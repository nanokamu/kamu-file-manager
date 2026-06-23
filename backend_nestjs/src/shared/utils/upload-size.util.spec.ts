import { BadRequestException } from '@nestjs/common';
import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import {
  createUploadSizeValidator,
  validateUploadSizeHeaders,
} from './upload-size.util';

describe('upload-size.util', () => {
  const limits = { maxBytes: 10, expectedBytes: 5 };

  describe('validateUploadSizeHeaders', () => {
    it('rejects declared size above max', () => {
      expect(() =>
        validateUploadSizeHeaders(undefined, {
          maxBytes: 10,
          expectedBytes: 11,
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects Content-Length above max', () => {
      expect(() => validateUploadSizeHeaders('11', { maxBytes: 10 })).toThrow(
        BadRequestException,
      );
    });

    it('rejects Content-Length mismatch with declared size', () => {
      expect(() => validateUploadSizeHeaders('4', limits)).toThrow(
        BadRequestException,
      );
    });

    it('allows matching Content-Length and declared size', () => {
      expect(() => validateUploadSizeHeaders('5', limits)).not.toThrow();
    });
  });

  describe('createUploadSizeValidator', () => {
    it('rejects streams larger than declared size', async () => {
      const source = Readable.from([Buffer.from('123456')]);
      const validator = createUploadSizeValidator(limits);

      await expect(pipeline(source, validator)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects streams smaller than declared size', async () => {
      const source = Readable.from([Buffer.from('12')]);
      const validator = createUploadSizeValidator(limits);

      await expect(pipeline(source, validator)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('passes streams that match declared size', async () => {
      const source = Readable.from([Buffer.from('12345')]);
      const validator = createUploadSizeValidator(limits);
      const chunks: Buffer[] = [];
      const sink = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(chunk as Buffer);
          callback();
        },
      });

      await pipeline(source, validator, sink);

      expect(Buffer.concat(chunks).toString()).toBe('12345');
    });
  });
});
