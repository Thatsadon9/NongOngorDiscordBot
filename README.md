<div align="center">

  # 🧠 Nong Ongor (น้องอ่องออ)
  ### The Ultimate Project Management & Entertainment Assistant for Discord
  
  <a href="https://discord.js.org/">
    <img src="https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/Node.js-v20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  </a>
  <a href="https://pptr.dev/">
    <img src="https://img.shields.io/badge/Puppeteer-Headless-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white" />
  </a>
  <a href="https://n8n.io/">
    <img src="https://img.shields.io/badge/n8n-Automation-EA4B71?style=for-the-badge&logo=n8n&logoColor=white" />
  </a>
  <a href="https://github.com/yt-dlp/yt-dlp">
    <img src="https://img.shields.io/badge/yt--dlp-Music-FF0000?style=for-the-badge&logo=youtube&logoColor=white" />
  </a>

  <br />
  <br />

  <p>
    <b>Nong Ongor</b> is a powerful Discord bot designed to streamline project management and provide entertainment. 
    It integrates seamlessly with <b>Google Sheets</b>, <b>n8n</b>, and <b>YouTube</b> to handle tasks, schedules, timelines, and music playback automatically.
  </p>

</div>

---

## ✨ Key Features (ฟีเจอร์หลัก)

### 1. 📝 Smart To-Do Dashboard
จัดการงานส่วนตัวแบบ Real-time ไม่ต้องสลับหน้าจอ
- **Add Tasks:** เพิ่มงาน กำหนด Deadline และ Assign คนได้
- **Update Status:** กดปุ่มเพื่อขีดฆ่างานที่เสร็จแล้ว
- **Interactive UI:** ใช้งานผ่านปุ่มและ Modal 100%

### 2. 📅 Auto-Scheduler (via n8n)
เชื่อมต่อ Discord เข้ากับ Google Sheets อัตโนมัติ
- พิมพ์คำสั่ง `/addevent` กรอกข้อมูลใน Discord
- บอทส่งข้อมูลผ่าน **Webhook (n8n)**
- ข้อมูลเด้งเข้า **Google Sheets** และสร้าง Timeline ให้อัตโนมัติ!

### 3. 📸 Visual Timeline Viewer (Puppeteer)
ดูภาพรวมโปรเจกต์ได้ทันทีโดยไม่ต้องเปิด Browser
- พิมพ์ `/schedule`
- บอทจะเปิด Chrome (Headless) บินไปถ่ายรูปหน้า Timeline
- ส่งรูปภาพคุณภาพสูงกลับมาให้ในแชททันที

### 4. 🎵 Music Player (via yt-dlp)
เล่นเพลงจาก YouTube ใน Voice Channel ได้เลย!
- **Play Music:** พิมพ์ `/play` ตามด้วยชื่อเพลงหรือ URL
- **Queue System:** เพิ่มเพลงต่อคิวได้ไม่จำกัด
- **Playback Controls:** หยุด, ข้าม, พัก, เล่นต่อ ได้ตามใจ
- **Autoplay:** ระบบเล่นเพลงที่คล้ายกันต่ออัตโนมัติ
- **High Quality:** สตรีมเสียงคุณภาพสูงจาก YouTube

---

## 🛠 Tech Stack

* **Runtime:** Node.js
* **Framework:** Discord.js (v14)
* **Voice:** @discordjs/voice + @discordjs/opus
* **Music:** yt-dlp + youtube-sr
* **Automation:** n8n (Webhook integration)
* **Browser Automation:** Puppeteer (Chrome Headless)
* **Database:** Google Sheets (via Publish to Web & CSV)

---

## 🚀 Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/Thatsadon9/NongOngorDiscordBot.git
cd NongOngorDiscordBot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Install yt-dlp (for Music Feature)
**Windows (via winget):**
```bash
winget install yt-dlp.yt-dlp
```

**macOS (via Homebrew):**
```bash
brew install yt-dlp
```

**Linux:**
```bash
sudo apt install yt-dlp
# or
pip install yt-dlp
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory and add the following:
```env
TOKEN=your_discord_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id
```

### 5. Register Commands
Run this command once to register slash commands:
```bash
node deploy-commands.js
```

### 6. Start the Bot
```bash
# Development
node index.js

# Production (using PM2)
pm2 start index.js --name "NongOngor"
```

---

## 🎮 Commands List

### 📋 Project Management
| Command | Description |
| :--- | :--- |
| `/todo` | เปิดหน้า Dashboard จัดการงาน (To-Do List) |
| `/addevent` | เพิ่มกำหนดการลง Google Sheets (ผ่าน n8n) |
| `/schedule` | 📸 ถ่ายรูปตาราง Timeline ล่าสุดจาก Google Sheets |

### 🎵 Music Player
| Command | Description |
| :--- | :--- |
| `/play <query>` | เล่นเพลงจากชื่อหรือ YouTube URL |
| `/queue` | แสดงรายการเพลงในคิว |
| `/skip` | ข้ามไปเพลงถัดไป |
| `/pause` | พักเพลงชั่วคราว |
| `/resume` | เล่นเพลงต่อ |
| `/stop` | หยุดเล่นและออกจาก Voice Channel |
| `/autoplay` | เปิด/ปิด Autoplay (เล่นเพลงที่คล้ายกันต่ออัตโนมัติ) |

---

## 📦 Dependencies

```json
{
  "discord.js": "^14.x",
  "@discordjs/voice": "^0.x",
  "@discordjs/opus": "^0.x",
  "@snazzah/davey": "^0.x",
  "youtube-sr": "^4.x",
  "ffmpeg-static": "^5.x",
  "puppeteer": "^22.x",
  "axios": "^1.x",
  "dotenv": "^16.x"
}
```

> **Note:** yt-dlp ต้องติดตั้งแยกผ่าน system package manager (ดูขั้นตอนด้านบน)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

<div align="center">
  
  Made with ❤️ by <b>Thatsadon</b>
  
  <br />
  
  ⭐ Star this repo if you find it helpful!
  
</div>
