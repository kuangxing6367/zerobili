plugins {
    id("com.android.application")
}

android {
    namespace = "top.zgric.zerobili"
    compileSdk = 36

    defaultConfig {
        applicationId = "top.zgric.zerobili"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    // 只保留一份 MARGIN 产物：assets/margin 由 scripts/sync-margin.js 从 vendor/margin 同步
    androidResources {
        noCompress += listOf("woff2")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // 没有自己的 keystore 时用 debug key 签，保证产出的 APK 拿到就能装。
            // 要正式分发就配 ZEROBILI_KEYSTORE / ZEROBILI_STORE_PASSWORD /
            // ZEROBILI_KEY_ALIAS / ZEROBILI_KEY_PASSWORD 四个环境变量。
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        resources.excludes += setOf("META-INF/*.kotlin_module")
    }

    lint {
        abortOnError = false
    }
}
