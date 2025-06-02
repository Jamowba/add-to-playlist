# 🎵 Add Current Song to Spotify Liked Songs

A simple web app that lets **viewers click a button to add the current song** (played via Songify) to **their own Spotify Liked Songs**.

---

## ✨ Features

✅ Displayed as a **Twitch Panel** button  
✅ Works on **mobile and desktop**  
✅ Adds song to **viewer’s own Liked Songs** (OAuth)  
✅ Pulls "Now Playing" from a **Google Sheet (auto-updated)**  
✅ Handles **multiple artists**  
✅ Has **Retry** and **Fallback** logic  
✅ Customisable:  
- **Background** (your logo)  
- Button text / style  
- Confirmation + Error pages  

---

## 🔗 Live Flow

1️⃣ Viewer clicks the button  
2️⃣ Viewer logs into Spotify (OAuth)  
3️⃣ Current song is looked up on Spotify  
4️⃣ If found → song is added to viewer’s Liked Songs  
5️⃣ Viewer sees a **confirmation screen**  
6️⃣ If not found → viewer sees an **error screen**  

---

## 🎁 How to Reuse This App (for your own brand)

### 1️⃣ Fork or Clone This Repo

```bash
git clone https://github.com/YOUR_USERNAME/add-to-playlist.git
```

---

### 2️⃣ Set Up `.env`

```env
CLIENT_ID=YOUR_SPOTIFY_CLIENT_ID
CLIENT_SECRET=YOUR_SPOTIFY_CLIENT_SECRET
REDIRECT_URI=https://YOUR_RENDER_URL/callback
```

You must create a **Spotify App** in the [Spotify Developer Portal](https://developer.spotify.com/dashboard).  

Set **Redirect URI** in Spotify app settings to match your deployed URL.  

---

### 3️⃣ Set Up Google Sheet Source

You need a **public Google Sheet** that outputs CSV — first row should look like:

```text
Artist1, Artist2 - Song Title
```

Example public link:

```
https://docs.google.com/spreadsheets/d/e/XXXXXXXXXX/pub?output=csv
```

Update `server.js`:

```js
const songFileURL = "YOUR_GOOGLE_SHEET_CSV_LINK";
```

---

### 4️⃣ Deploy on Render

- Create **new Web Service** on [Render](https://render.com)  
- Connect to your GitHub repo  
- Set **Build Command** → *leave blank*  
- Set **Start Command** → `node server.js`  
- Set **Environment Variables** → from your `.env`  

---

### 5️⃣ Customise Brand

Update:  

```
/public/index.html  
/views/confirmation.html  
/views/error.html  
```

To use your own logo:

```css
background: url('/images/Your-Logo.png') no-repeat center center fixed;
```

---

## ⚙️ How Songify Feeds The Sheet (DaddyMac’s Setup)

On my PC, I run **Songify** → which writes to this file:

```
C:\Users\YOURFILES\OneDrive\Desktop\songify\Songify.txt
```

I run this **BAT file** to auto-update the Google Sheet every 2 sec:

```bat
powershell -ExecutionPolicy Bypass -File "C:\Path\To\UpdateSongifyToSheet.ps1"
```

My `UpdateSongifyToSheet.ps1` script reads the `Songify.txt`, URL-encodes it, and sends it to a **Google Apps Script Webhook** that updates the sheet.

---

## 🗂 Project Structure

```
/public
  index.html          --> Main button
  /images/Your-Logo.png

/views
  confirmation.html   --> Song added screen
  error.html          --> Error screen

server.js             --> Main app logic
.env                  --> Your Spotify secrets
```

---

## ⚠️ Notes / Limitations

- Spotify API rate limits apply  
- Songify must be kept running + updating the Google Sheet  
- Viewers must authorize Spotify (OAuth flow) — one time per session  
- Viewer can be on **desktop or mobile** (Twitch app)  

---

## 🙏 Credits

Original project by [DaddyMac on Twitch](https://www.twitch.tv/daddymacaronii) 🎵  
Inspired by Twitch music streamers 🎶  

💜 *No obligation but feel free to leave me a tip here:* [https://streamlabs.com/daddymacaronii/tip](https://streamlabs.com/daddymacaronii/tip) 🎶

---

Hope you and your viewers enjoy it!! 🚀🎧
