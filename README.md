# Standard Generic Image Background Remover

An elegant, modern, high-performance web application that delivers high-quality background removal directly in your browser. Powered by client-side background removal models, it features interactive mask adjustment, split-screen previews, real-time comparison capabilities, and highly custom background composite engines.

---

## 🎨 Key Features

*   **Offline-Ready Background Removal:** Performs inference locally using client-side background removal engines, ensuring user data privacy and fast execution.
*   **Aesthetic Compare Engine:** Includes a dynamic side-by-side comparison slider showing a real-time before/after effect.
*   **Customizable Transparency Backdrops:** Choose how to visualize transparent backgrounds during isolation:
    *   **Classic Checkered Grid** (slate-gray pixel grid) — *Active by default*
    *   **Solid Black** (maximum contrast)
    *   **Solid White** (clean visual studio workspace)
*   **Composite Customizer:** Easily replace the background with beautiful custom solid color fills.
*   **Optimized Performance:** Smooth fluid transition mechanics powered by `motion` and optimized layout sizing with `ResizeObserver`.

---

## 💻 Local Development (Windows, macOS & Linux)

Setting up the project locally requires no Bash or Unix environment. Standard Windows Command Prompt, PowerShell, or macOS/Linux terminals work out-of-the-box.

### 1. Prerequisites
*   Download and install **Node.js** (v18 or higher is recommended) from [nodejs.org](https://nodejs.org/).

### 2. Getting Started
Open your terminal (PowerShell or Command Prompt on Windows) in the folder where you downloaded or cloned this repository and run:

```cmd
:: 1. Install all required dependencies
npm install

:: 2. Boot the local development server
npm run dev
```

Once the server begins running, configure your browser to open:
👉 **`http://localhost:3000`**

### 3. Creating a Production Build
To bundle the web app with optimized assets for hosting (e.g., Vercel, Netlify, or Github Pages), run:

```cmd
npm run build
```
This compilation outputs all production-ready files directly to the `dist/` directory.

---

## 📱 How to Convert into an Android App (APK)

Since this app is built as a responsive Single Page Application (SPA), the simplest and most robust way to build a real Android native App (`.apk`) is with **Capacitor** by Ionic. This embeds your web app into a high-performance, native web-view shell.

Follow this step-by-step pipeline on Windows:

### Step 1: Install Required Android Build Tools
1.  **Install Java Development Kit (JDK):** Download and install JDK 17 (or newer) from [Oracle](https://www.oracle.com/java/technologies/downloads/) or [Eclipse Temurin](https://adoptium.net/).
2.  **Install Android Studio:** Download and install [Android Studio](https://developer.android.com/studio).
3.  Open Android Studio, navigate to the SDK Manager, and verify that you have downloaded the latest **Android SDK Platform** and **SDK Platform-Tools**.

### Step 2: Install and Set Up Capacitor in Your Project
In your project’s root folder (using Command Prompt or PowerShell), install Capacitor's core CLI libraries:

```cmd
npm install @capacitor/core @capacitor/cli
```

### Step 3: Initialize Capacitor Configuration
Initialize Capacitor with your app name and a custom bundle ID (e.g., `com.yourname.bgremover`):

```cmd
npx cap init "Standard Background Remover" "com.example.bgremover" --web-dir=dist
```

### Step 4: Build Your App
Run the build script to generate static production assets in the `/dist` directory:

```cmd
npm run build
```

### Step 5: Add the Android Native Platform
Install the Capacitor Android package and add it as a native workspace container:

```cmd
npm install @capacitor/android
npx cap add android
```

### Step 6: Sync Your Web Files with Android
Whenever you modify your React code or asset structure, rebuilt the web assets and sync them to Android:

```cmd
npm run build
npx cap sync
```

### Step 7: Build the APK inside Android Studio
Launch Android Studio and open the generated Android native project directory:

```cmd
npx cap open android
```

1.  **Wait for Gradle to sync:** This might take a few minutes as it pulls down Android dependencies.
2.  **Build the debug APK:** 
    *   In the top menu, go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
    *   Android Studio compiles the APK. A notification popup displays when completed, letting you click **"Locate"** to find the file `app-debug.apk`.
3.  **Deploy directly to your connected device (Optional):**
    *   Enable **USB Debugging** on your phone (found in Settings > Developer Options).
    *   Connect your device via USB.
    *   Select your device in Android Studio's target selector, and click the **Run (Green Play Arrow)** button.

---

## 🛠️ Alternative: Install as a Progressive Web App (PWA)

If you host the production bundle (`dist/`) on a secure website with HTTPS (using Vercel, Netlify, or similar platforms):
1.  Open Chrome, Edge, or Safari on your mobile device.
2.  Navigate to your hosted application URL.
3.  Open the browser options/menu button and select **"Add to Home Screen"** (or click the install icon in your URL bar).
4.  The application will install directly to your device desktop like a native application, opening with full-screen hardware optimization and zero browser headers!
