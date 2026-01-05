<div align="center">

  # 🧠 Nong Ongor (น้องอ่องออ)
  ### The Ultimate Project Management Assistant for Discord
  
  <a href="[https://discord.js.org/](https://discord.js.org/)">
    <img src="[https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)" />
  </a>
  <a href="[https://nodejs.org/](https://nodejs.org/)">
    <img src="[https://img.shields.io/badge/Node.js-v20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white](https://img.shields.io/badge/Node.js-v20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)" />
  </a>
  <a href="[https://pptr.dev/](https://pptr.dev/)">
    <img src="[https://img.shields.io/badge/Puppeteer-Headless-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white](https://img.shields.io/badge/Puppeteer-Headless-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white)" />
  </a>
  <a href="[https://n8n.io/](https://n8n.io/)">
    <img src="[https://img.shields.io/badge/n8n-Automation-EA4B71?style=for-the-badge&logo=n8n&logoColor=white](https://img.shields.io/badge/n8n-Automation-EA4B71?style=for-the-badge&logo=n8n&logoColor=white)" />
  </a>

  <br />
  <br />

  <p>
    <b>Nong Ongor</b> is a powerful Discord bot designed to streamline project management. 
    It integrates seamlessly with <b>Google Sheets</b> and <b>n8n</b> to handle tasks, schedules, and timelines automatically.
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

---

## 🛠 Tech Stack

* **Runtime:** Node.js
* **Framework:** Discord.js (v14)
* **Automation:** n8n (Webhook integration)
* **Browser Automation:** Puppeteer (Chrome Headless)
* **Database:** Google Sheets (via Publish to Web & CSV)

---

## 🚀 Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/YourName/NongOngorDiscordBot.git
cd NongOngorDiscordBot
```

### 2. Install Dependencies
```bash
npm install
# For Linux Server (Ubuntu/Debian) - Required for Puppeteer
sudo apt-get install fonts-thai-tlwg fonts-kanit
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory and add the following:
```env
TOKEN=your_discord_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id
```

### 4. Register Commands
Run this command once to register slash commands (`/todo`, `/schedule`, `/addevent`):
```bash
node deploy-commands.js
```

### 5. Start the Bot
```bash
# Development
node index.js

# Production (using PM2)
pm2 start index.js --name "NongOngor"
```

---

## 🎮 Commands List

| Command | Description |
| :--- | :--- |
| `/todo` | เปิดหน้า Dashboard จัดการงาน (To-Do List) |
| `/addevent` | เพิ่มกำหนดการลง Google Sheets (ผ่าน n8n) |
| `/schedule` | 📸 ถ่ายรูปตาราง Timeline ล่าสุดจาก Google Sheets |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  Developed with ❤️ by <b>[Your Name]</b>
</div>
