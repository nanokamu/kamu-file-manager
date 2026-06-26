import { Test, TestingModule } from '@nestjs/testing';
import { AddonController } from './addon.controller';
import { AddonService } from '../services/addon.service';

describe('AddonController', () => {
  let addonController: AddonController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AddonController],
      providers: [AddonService],
    }).compile();

    addonController = app.get<AddonController>(AddonController);
  });

  describe('addonDownloadAsZip', () => {
    it('should return stub response with required archive options', () => {
      expect(
        addonController.addonDownloadAsZip({
          locators: ['a.txt'],
          archiveName: 'archive.zip',
          archiveType: 'zip',
        }),
      ).toEqual({
        status: 'ok',
        message: 'addonDownloadAsZip dummy endpoint',
        locators: ['a.txt'],
        archiveName: 'archive.zip',
        archiveType: 'zip',
      });
    });

    it('should return stub response with provided archive options', () => {
      expect(
        addonController.addonDownloadAsZip({
          locators: ['docs/readme.txt', 'docs/guide.pdf'],
          archiveName: 'bundle.zip',
          archiveType: 'tar.gz',
        }),
      ).toEqual({
        status: 'ok',
        message: 'addonDownloadAsZip dummy endpoint',
        locators: ['docs/readme.txt', 'docs/guide.pdf'],
        archiveName: 'bundle.zip',
        archiveType: 'tar.gz',
      });
    });
  });
});
