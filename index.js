require("dotenv").config();
const puppeteer = require("puppeteer"); 
const axios = require("axios");
const {
  Client,
  GatewayIntentBits,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

// --- CONFIG ---

// 1. ลิงก์หน้าเว็บ Timeline (ที่ Publish to web แล้ว)
const SHEET_WEB_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwjOqR5KLulWduYOI1_sNIFG45uG_D-UPo8OJUpCaoxeL_FVrjepgMmfmtVaM8AfLWTUqh9FKK8xH-/pubhtml?gid=123557804&single=true";

// 2. ลิงก์ Webhook ของ n8n
const N8N_WEBHOOK_URL = "https://thatsadon.app.n8n.cloud/webhook/nongongor";

// 3. ลิงก์ Google Sheets หลัก (สำหรับปุ่มวาร์ป)
const GOOGLE_SHEET_LINK =
  "https://docs.google.com/spreadsheets/d/158tGp9w9uR7yRf9xfyQABV5vUTc9hcUjfDPV5klHLzI/edit?usp=sharing";

// --- MEMORY (จำลอง Database สำหรับ To-Do List) ---
let tasks = [];
let dashboardMessage = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- HELPER FUNCTIONS ---

// 1. สร้างหน้า Dashboard (To-Do List)
const generateDashboard = () => {
  let description =
    tasks.length === 0 ? "```ansi\n[0;33m✨ ยังไม่มีงานจ้า ว่างสบาย![0m\n```" : "";

  tasks.forEach((task, index) => {
    const statusIcon = task.status === "done" ? "✅" : "🔥";
    const titleStyle = task.status === "done" ? "~~" : "**";

    description += `\n## ${statusIcon} ${titleStyle}งานที่ ${index + 1}: ${
      task.name
    }${titleStyle}\n`;
    description += `>>> **รายละเอียด:** ${task.desc}\n`;
    description += `**⏰ Deadline:** \`${task.deadline}\`\n`;
    description += `**👤 ผู้รับผิดชอบ:** <@${task.owner}>\n`;
    description += `-----------------------------------\n`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x00ff99)
    .setTitle("🚀 PROJECT DASHBOARD")
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: "Project Management Bot • Updated just now" });

  return embed;
};

// 2. สร้างปุ่มสำหรับ Dashboard
const generateButtons = () => {
  const addBtn = new ButtonBuilder()
    .setCustomId("btn_add")
    .setLabel("เพิ่มงานใหม่")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("➕");

  const completeBtn = new ButtonBuilder()
    .setCustomId("btn_complete")
    .setLabel("อัปเดตสถานะ")
    .setStyle(ButtonStyle.Success)
    .setEmoji("✅");

  const clearBtn = new ButtonBuilder()
    .setCustomId("btn_clear")
    .setLabel("ล้างงานที่เสร็จ")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("🗑️");

  return new ActionRowBuilder().addComponents(addBtn, completeBtn, clearBtn);
};

// --- MAIN LOGIC ---

client.once(Events.ClientReady, (c) => {
  console.log(`🤖 บอทพร้อมทำงานแล้วในร่าง: ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  // ==========================================
  //  ZONE 1: TO-DO LIST DASHBOARD
  // ==========================================

  if (interaction.isChatInputCommand() && interaction.commandName === "todo") {
    const embed = generateDashboard();
    const row = generateButtons();
    dashboardMessage = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });
  }

  if (interaction.isButton() && interaction.customId === "btn_add") {
    const modal = new ModalBuilder()
      .setCustomId("modal_add_task")
      .setTitle("📝 เพิ่มงานใหม่ (To-Do)");

    const nameInput = new TextInputBuilder()
      .setCustomId("inp_name")
      .setLabel("ชื่องาน")
      .setStyle(TextInputStyle.Short);
    const descInput = new TextInputBuilder()
      .setCustomId("inp_desc")
      .setLabel("รายละเอียด")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    const dateInput = new TextInputBuilder()
      .setCustomId("inp_date")
      .setLabel("Deadline")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("เช่น พรุ่งนี้ 10 โมง");

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(descInput),
      new ActionRowBuilder().addComponents(dateInput)
    );
    await interaction.showModal(modal);
  }

  if (
    interaction.isModalSubmit() &&
    interaction.customId === "modal_add_task"
  ) {
    const name = interaction.fields.getTextInputValue("inp_name");
    const desc = interaction.fields.getTextInputValue("inp_desc") || "-";
    const date = interaction.fields.getTextInputValue("inp_date");

    tasks.push({
      name,
      desc,
      deadline: date,
      owner: interaction.user.id,
      status: "pending",
    });

    if (dashboardMessage)
      await dashboardMessage.edit({ embeds: [generateDashboard()] });
    await interaction.reply({
      content: "✅ เพิ่มงานเรียบร้อย!",
      ephemeral: true,
    });
  }

  if (interaction.isButton() && interaction.customId === "btn_complete") {
    if (tasks.length === 0)
      return interaction.reply({
        content: "😅 ไม่มีงานให้แก้ครับ",
        ephemeral: true,
      });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("select_complete_task")
      .setPlaceholder("เลือกงานที่ทำเสร็จแล้ว...")
      .addOptions(
        tasks.map((task, index) => ({
          label: `${index + 1}. ${task.name}`,
          description: `ของ ${task.deadline}`,
          value: index.toString(),
        }))
      );

    await interaction.reply({
      components: [new ActionRowBuilder().addComponents(selectMenu)],
      ephemeral: true,
    });
  }

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "select_complete_task"
  ) {
    const index = parseInt(interaction.values[0]);
    if (tasks[index]) tasks[index].status = "done";
    if (dashboardMessage)
      await dashboardMessage.edit({ embeds: [generateDashboard()] });
    await interaction.update({
      content: `🎉 เยี่ยมมาก! งาน "${tasks[index].name}" เสร็จแล้ว!`,
      components: [],
    });
  }

  if (interaction.isButton() && interaction.customId === "btn_clear") {
    tasks = tasks.filter((t) => t.status !== "done");
    if (dashboardMessage)
      await dashboardMessage.edit({ embeds: [generateDashboard()] });
    await interaction.reply({
      content: "🧹 ล้างงานที่เสร็จแล้วเรียบร้อย",
      ephemeral: true,
    });
  }

  // ==========================================
  //  ZONE 2: AUTO-SCHEDULER (Connect n8n)
  // ==========================================

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "addevent"
  ) {
    const modal = new ModalBuilder()
      .setCustomId("modal_add_event")
      .setTitle("📅 เพิ่มกำหนดการ (ส่งไป Sheet)");

    const projectInput = new TextInputBuilder()
      .setCustomId("evt_project")
      .setLabel("ชื่อโครงการ (เช่น Rookie SS3)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("ต้องตรงกับชื่อใน Sheet เป๊ะๆ นะ");

    const taskInput = new TextInputBuilder()
      .setCustomId("evt_task")
      .setLabel("กิจกรรม (เช่น Final Pitching)")
      .setStyle(TextInputStyle.Short);

    const dateInput = new TextInputBuilder()
      .setCustomId("evt_date")
      .setLabel("วันที่ (Format: M/D/YYYY)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("1/1/2569");

    const tagInput = new TextInputBuilder()
      .setCustomId("evt_tag")
      .setLabel("Color Tag (ระบุสี)") // ✅ ชื่อสั้นๆ ไม่ Crash แน่นอน
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("red, orange, yellow, green, blue, purple"); // ✅ ใส่คำอธิบายตรงนี้แทน

    modal.addComponents(
      new ActionRowBuilder().addComponents(projectInput),
      new ActionRowBuilder().addComponents(taskInput),
      new ActionRowBuilder().addComponents(dateInput),
      new ActionRowBuilder().addComponents(tagInput)
    );

    await interaction.showModal(modal);
  }

  if (
    interaction.isModalSubmit() &&
    interaction.customId === "modal_add_event"
  ) {
    // ✅ ใส่ .trim() เพื่อตัดช่องว่างหน้าหลัง ป้องกันปัญหา row ซ้ำ
    const project = interaction.fields.getTextInputValue("evt_project").trim();
    const task = interaction.fields.getTextInputValue("evt_task").trim();
    const date = interaction.fields.getTextInputValue("evt_date").trim();
    const tag = interaction.fields.getTextInputValue("evt_tag").trim();

    await interaction.deferReply();

    try {
      await axios.post(N8N_WEBHOOK_URL, {
        project: project,
        task: task,
        date: date,
        tag: tag,
        user: interaction.user.username,
        userId: interaction.user.id,
      });

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`✅ บันทึกตารางงานแล้ว!`)
        .setDescription(`ข้อมูลถูกส่งไปที่ Google Sheets หน้า db_timeline แล้ว`)
        .addFields(
          { name: "📂 โครงการ", value: project, inline: true },
          { name: "📌 กิจกรรม", value: task, inline: true },
          { name: "📅 วันที่", value: date, inline: true }
        );

      const sheetButton = new ButtonBuilder()
        .setLabel("📂 เปิดดูตาราง Timeline")
        .setStyle(ButtonStyle.Link)
        .setURL(GOOGLE_SHEET_LINK);

      const row = new ActionRowBuilder().addComponents(sheetButton);

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error("Error sending to n8n:", error);
      const errorMessage = error.response
        ? `Status: ${error.response.status} (${error.response.statusText})`
        : error.message;

      await interaction.editReply(
        `❌ เกิดข้อผิดพลาด! \n\`${errorMessage}\` \n(เช็ค URL n8n หรือดูว่า Activate Workflow หรือยัง?)`
      );
    }
  }

  // ==========================================
  //  ZONE 3: PUPPETEER (ถ่ายรูปตาราง) 📸
  // ==========================================

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "schedule"
  ) {
    await interaction.deferReply(); // บอกให้รอแป๊บ

    let browser = null;
    try {
      console.log("📸 กำลังเริ่มถ่ายรูป...");

      browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();

      // 1. ตั้งค่าหน้าจอให้ใหญ่ๆ ไว้ก่อน
      await page.setViewport({ width: 1920, height: 1080 });

      // 2. เปิดเว็บ
      await page.goto(SHEET_WEB_URL, { waitUntil: "networkidle0" });
      // ... (หลังจาก page.goto)

      // ... (หลังจาก page.goto)

      // 1. เปิดหน้าเว็บตามปกติ
      await page.goto(SHEET_WEB_URL, { waitUntil: "networkidle0" });

      // 🔥 เพิ่มท่อนนี้: บังคับฉีด Font Kanit เข้าไปในระบบของหน้านั้นเลย
      await page.addStyleTag({
        content: `@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;700&display=swap');`,
      });

      // 2. สั่งให้รอจนกว่า Font จะโหลดเสร็จจริงๆ (สำคัญมาก)
      await page.evaluate(() => document.fonts.ready);

      // 3. รอเพิ่มอีกนิดเพื่อให้ Chrome วาดตัวหนังสือใหม่
      await new Promise((r) => setTimeout(r, 3000));

      // 4. ถ่ายรูป
      const imageBuffer = await page.screenshot({ fullPage: true });

      // 4. ส่งรูป
      await interaction.editReply({
        content: "📸 ตาราง Timeline ล่าสุดมาแล้วครับ!",
        files: [imageBuffer],
      });
      console.log("✅ ถ่ายรูปเสร็จสิ้น!");
    } catch (error) {
      console.error("Puppeteer Error:", error);
      await interaction.editReply(
        "❌ ถ่ายรูปไม่สำเร็จ! (อาจจะเกิดจาก Server หรือลิงก์มีปัญหา)"
      );
    } finally {
      if (browser) await browser.close();
    }
  }
});

client.login(process.env.TOKEN);
