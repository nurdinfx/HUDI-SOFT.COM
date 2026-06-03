package com.hudisoft.hms;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.hudisoft.hms.plugins.ApkInstallerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkInstallerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
