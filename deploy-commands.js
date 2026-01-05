const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
    // 1. คำสั่ง To-Do List
    new SlashCommandBuilder()
        .setName('todo')
        .setDescription('เรียกดู Dashboard รายการสิ่งที่ต้องทำ'),

    // 2. คำสั่งลงตารางงาน (Sheet)
    new SlashCommandBuilder()
        .setName('addevent')
        .setDescription('เพิ่มกำหนดการลง Google Sheets')
        .addStringOption(option => option.setName('dummy').setDescription('กด Enter เพื่อเปิดแบบฟอร์ม')), // ใส่หลอกๆ เพื่อให้กดง่ายขึ้น

    // 3. คำสั่งถ่ายรูปตาราง (Puppeteer)
    new SlashCommandBuilder()
        .setName('schedule')
        .setDescription('📸 ถ่ายรูปตาราง Timeline ล่าสุดมาโชว์'),
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('🔄 กำลังลงทะเบียนคำสั่ง...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('✅ ลงทะเบียนคำสั่งเรียบร้อย!');
    } catch (error) {
        console.error(error);
    }
})();