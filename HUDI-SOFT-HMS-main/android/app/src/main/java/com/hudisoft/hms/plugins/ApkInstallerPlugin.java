package com.hudisoft.hms.plugins;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod
    public void canRequestPackageInstalls(PluginCall call) {
        boolean canInstall = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            canInstall = getContext().getPackageManager().canRequestPackageInstalls();
        }
        JSObject ret = new JSObject();
        ret.put("value", canInstall);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPackageInstallsPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String urlString = call.getString("url");
        if (urlString == null || urlString.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        new Thread(() -> {
            HttpURLConnection connection = null;
            InputStream input = null;
            OutputStream output = null;

            try {
                URL url = new URL(urlString);
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(15000);
                connection.connect();

                int responseCode = connection.getResponseCode();
                if (responseCode != HttpURLConnection.HTTP_OK) {
                    call.reject("Server returned HTTP " + responseCode);
                    return;
                }

                int fileLength = connection.getContentLength();
                File outputDir = getContext().getCacheDir();
                File apkFile = new File(outputDir, "update.apk");

                if (apkFile.exists()) {
                    apkFile.delete();
                }

                input = new BufferedInputStream(connection.getInputStream());
                output = new FileOutputStream(apkFile);

                byte[] data = new byte[1024 * 8];
                long total = 0;
                int count;
                long lastNotifyTime = 0;

                while ((count = input.read(data)) != -1) {
                    total += count;
                    output.write(data, 0, count);

                    long now = System.currentTimeMillis();
                    if (now - lastNotifyTime > 100 && fileLength > 0) {
                        double progress = (double) total / fileLength;
                        JSObject event = new JSObject();
                        event.put("progress", progress);
                        event.put("bytesDownloaded", total);
                        event.put("totalBytes", fileLength);
                        notifyListeners("downloadProgress", event);
                        lastNotifyTime = now;
                    }
                }

                if (fileLength > 0) {
                    JSObject event = new JSObject();
                    event.put("progress", 1.0);
                    event.put("bytesDownloaded", total);
                    event.put("totalBytes", fileLength);
                    notifyListeners("downloadProgress", event);
                }

                output.flush();
                output.close();
                output = null;
                input.close();
                input = null;

                installApkFile(apkFile);
                call.resolve();

            } catch (Exception e) {
                call.reject(e.getMessage());
            } finally {
                try {
                    if (input != null) input.close();
                    if (output != null) output.close();
                    if (connection != null) connection.disconnect();
                } catch (Exception ignored) {}
            }
        }).start();
    }

    private void installApkFile(File file) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                Uri apkUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    file
                );
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                intent.setDataAndType(Uri.fromFile(file), "application/vnd.android.package-archive");
            }

            getActivity().startActivity(intent);
        } catch (Exception e) {
            // Error already surfaced via call.reject in download thread
        }
    }
}
