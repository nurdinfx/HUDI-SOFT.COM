import { registerPlugin } from '@capacitor/core';

export interface ApkInstallerPlugin {
  canRequestPackageInstalls(): Promise<{ value: boolean }>;
  requestPackageInstallsPermission(): Promise<void>;
  downloadAndInstall(options: { url: string }): Promise<void>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (data: {
      progress: number;
      bytesDownloaded: number;
      totalBytes: number;
    }) => void,
  ): Promise<{ remove: () => void }>;
}

const ApkInstaller = registerPlugin<ApkInstallerPlugin>('ApkInstaller');

export default ApkInstaller;
