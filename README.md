# Safety On Speed (SOS)

**Safety On Speed** is a comprehensive personal safety platform developed in React Native. It is designed to provide immediate assistance during emergencies by connecting users to emergency services and personal guardians with a single tap.

🔗 **Official Website:** [https://safetyonspeed.lk/](https://safetyonspeed.lk/)

## 📱 App Overview

The SOS app provides a streamlined "Emergency Flow" that automates location tracking and alert delivery.

### Core Features
* **One-Tap Quick SOS**: Instantly triggers a silent alert.
* **Emergency Flow (Triple Tap)**: Starts a high-priority emergency sequence, including a direct prompt to call **119**.
* **Live Tracking & Heatmaps**: Interactive map of Sri Lanka with safety heatmaps and quick-access filters for Police Stations, Hospitals, and Pharmacies.
* **Guardian System**: Configure up to 5 trusted contacts to receive automated SMS and WhatsApp alerts.
* **Safe Spaces Directory**: Quick-dial hotlines for:
    * Ambulance Service
    * Fire & Rescue
    * Women & Child Bureau
* **Community Forum**: A dedicated space for users to post safety topics and share experiences.

---

## 🛠 Installation & Setup (Expo)

This project uses **Expo** for a seamless cross-platform development experience.

### Prerequisites
* **Node.js** (LTS version)
* **Expo Go** app installed on your [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) or [iOS](https://apps.apple.com/us/app/expo-go/id982107779) device.
* **Supabase Account** (if using the multi-tenant backend features).

### Step 1: Clone and Install
```bash
# Clone the repository
git clone https://github.com/Gagana-Perera/Safety-on-Speed.git

# Navigate to project directory
cd safety-on-speed

# Install dependencies
npm install
```

### Step 2: Configure Environment
Create a `.env` file in the root directory and add your API keys:
```env
Contact Team
```

### Step 3: Run with Expo Go
Launch the development server:
```bash
npm run start
OR
npx expo start
```

1.  Open the **Expo Go** app on your phone.
2.  Scan the **QR Code** displayed in your terminal.
3.  Ensure your phone and computer are on the **same Wi-Fi network**.

---

## 🏗 System Architecture (Technical Specs)

* **Frontend**: React Native / Expo (Managed Workflow)
* **Styling**: NativeWind / Tailwind CSS
* **Navigation**: React Navigation (Bottom Tabs & Stack)
* **Maps**: Google Maps API with custom Heatmap integration
* **Backend**: Supabase (Auth, Database, and Real-time Tracking)

---

## 👥 The Development Team
* **Gagana Perera** (Team Leader)
* **Chamethya Yasodie**
* **Nimsara Karunaratne**
* **Shenal Arosha**
* **Amaya Pitawela**
* **Rivindu Sanjula**

---

## 📞 Support & Contact
* **Email**: grsacn2025@gmail.com
* **Phone**: +94 74 341 7006
* **Location**: IIT (Informatics Institute of Technology), Sri Lanka.
