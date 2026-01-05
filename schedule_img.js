
// ... (ส่วน Config อื่นๆ)
const SHEET_WEB_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-xxxxxx/pubhtml?gid=0&single=true'; // เอาลิงก์ Web page มาใส่

client.on(Events.InteractionCreate, async interaction => {
    // ... (คำสั่งอื่นๆ)

    // สร้างคำสั่งใหม่ /schedule_img
    if (interaction.isChatInputCommand() && interaction.commandName === 'schedule_img') {
        await interaction.deferReply(); // บอกให้รอแป๊บ (ถ่ายรูปใช้เวลา 3-5 วิ)

        let browser = null;
        try {
            // 1. เปิด Browser (โหมดไร้หัว - Headless)
            browser = await puppeteer.launch({ 
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox'] // จำเป็นสำหรับบาง Host
            });
            const page = await browser.newPage();

            // 2. ปรับขนาดหน้าจอให้กว้างพอจะเห็นตารางครบ
            await page.setViewport({ width: 1920, height: 1080 });

            // 3. ไปที่ลิงก์ Google Sheets
            await page.goto(SHEET_WEB_URL, { waitUntil: 'networkidle0' });

            // 4. รอหาตาราง (Google Sheets publish มักจะอยู่ใน <table> หรือ class 'waffle')
            // เราจะแคปทั้งหน้า หรือเจาะจง Element ก็ได้
            // ในที่นี้ลองแคปเฉพาะตาราง (Element selector อาจต้องปรับตามหน้าเว็บจริง)
            const tableElement = await page.$('table'); 
            
            let imageBuffer;
            if (tableElement) {
                imageBuffer = await tableElement.screenshot();
            } else {
                // ถ้าหาตารางไม่เจอ แคปทั้งหน้าแม่มเลย
                imageBuffer = await page.screenshot({ fullPage: true });
            }

            // 5. ส่งรูปเข้า Discord
            await interaction.editReply({ 
                content: '📸 ตาราง Timeline ล่าสุดครับ!',
                files: [imageBuffer] 
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ ถ่ายรูปไม่สำเร็จ! (อาจจะหนักเครื่อง Server เกินไป)');
        } finally {
            // 6. ปิด Browser เสมอ (ไม่งั้นแรมหมด)
            if (browser) await browser.close();
        }
    }
});