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
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
  NoSubscriberBehavior,
} = require("@discordjs/voice");
const YouTube = require("youtube-sr").default; // You can remove this if using play-dl for search
const play = require("play-dl"); // Keep play-dl for searching
const { spawn } = require("child_process"); // <--- ADD THIS BACK
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════════
//  CONFIG & CONSTANTS
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  SHEET_WEB_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwjOqR5KLulWduYOI1_sNIFG45uG_D-UPo8OJUpCaoxeL_FVrjepgMmfmtVaM8AfLWTUqh9FKK8xH-/pubhtml?gid=123557804&single=true",
  N8N_WEBHOOK_URL: "http://localhost:5678/webhook/nongongor",
  GOOGLE_SHEET_LINK:
    "https://docs.google.com/spreadsheets/d/158tGp9w9uR7yRf9xfyQABV5vUTc9hcUjfDPV5klHLzI/edit?usp=sharing",
  KANIT_FONT_URL:
    "https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;700&display=swap",
  SCREENSHOT_DELAY_MS: 3000,
  VIEWPORT: { width: 1920, height: 1080 },
};

const COLORS = {
  SUCCESS: 0x00ff99,
  WARNING: 0xf1c40f,
};

const CUSTOM_IDS = {
  BTN_ADD: "btn_add",
  BTN_COMPLETE: "btn_complete",
  BTN_CLEAR: "btn_clear",
  MODAL_ADD_TASK: "modal_add_task",
  MODAL_ADD_EVENT: "modal_add_event",
  SELECT_COMPLETE_TASK: "select_complete_task",
};

// ═══════════════════════════════════════════════════════════════
//  STATE (In-Memory Database)
// ═══════════════════════════════════════════════════════════════

const state = {
  tasks: [],
  dashboardMessage: null,
};

// ═══════════════════════════════════════════════════════════════
//  DISCORD CLIENT SETUP
// ═══════════════════════════════════════════════════════════════

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates, // Required for music
  ],
});

// ═══════════════════════════════════════════════════════════════
//  MUSIC PLAYER STATE
// ═══════════════════════════════════════════════════════════════

const musicQueues = new Map(); // guildId -> { connection, player, queue, currentTrack, textChannel, autoplay, lastTrack }

const getMusicQueue = (guildId) => {
  if (!musicQueues.has(guildId)) {
    musicQueues.set(guildId, {
      connection: null,
      player: null,
      queue: [],
      currentTrack: null,
      textChannel: null,
      autoplay: false,
      lastTrack: null,
    });
  }
  return musicQueues.get(guildId);
};

// ═══════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatErrorMessage = (error) =>
  error.response
    ? `Status: ${error.response.status} (${error.response.statusText})`
    : error.message;

// ═══════════════════════════════════════════════════════════════
//  EMBED & COMPONENT BUILDERS
// ═══════════════════════════════════════════════════════════════

const buildTaskDescription = (task, index) => {
  const statusIcon = task.status === "done" ? "✅" : "🔥";
  const titleStyle = task.status === "done" ? "~~" : "**";

  return [
    `\n## ${statusIcon} ${titleStyle}งานที่ ${index + 1}: ${task.name}${titleStyle}`,
    `>>> **รายละเอียด:** ${task.desc}`,
    `**⏰ Deadline:** \`${task.deadline}\``,
    `**👤 ผู้รับผิดชอบ:** <@${task.owner}>`,
    `-----------------------------------`,
  ].join("\n");
};

const generateDashboardEmbed = () => {
  const description =
    state.tasks.length === 0
      ? "```ansi\n[0;33m✨ ยังไม่มีงานจ้า ว่างสบาย![0m\n```"
      : state.tasks.map(buildTaskDescription).join("");

  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle("🚀 PROJECT DASHBOARD")
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: "Project Management Bot • Updated just now" });
};

const generateDashboardButtons = () => {
  const buttons = [
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_ADD)
      .setLabel("เพิ่มงานใหม่")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("➕"),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_COMPLETE)
      .setLabel("อัปเดตสถานะ")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_CLEAR)
      .setLabel("ล้างงานที่เสร็จ")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑️"),
  ];

  return new ActionRowBuilder().addComponents(buttons);
};

const generateEventSuccessEmbed = (project, task, date) =>
  new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle("✅ บันทึกตารางงานแล้ว!")
    .setDescription("ข้อมูลถูกส่งไปที่ Google Sheets หน้า db_timeline แล้ว")
    .addFields(
      { name: "📂 โครงการ", value: project, inline: true },
      { name: "📌 กิจกรรม", value: task, inline: true },
      { name: "📅 วันที่", value: date, inline: true }
    );

const generateSheetLinkButton = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("📂 เปิดดูตาราง Timeline")
      .setStyle(ButtonStyle.Link)
      .setURL(CONFIG.GOOGLE_SHEET_LINK)
  );

// ═══════════════════════════════════════════════════════════════
//  MODAL BUILDERS
// ═══════════════════════════════════════════════════════════════

const buildAddTaskModal = () => {
  const modal = new ModalBuilder()
    .setCustomId(CUSTOM_IDS.MODAL_ADD_TASK)
    .setTitle("📝 เพิ่มงานใหม่ (To-Do)");

  const inputs = [
    new TextInputBuilder()
      .setCustomId("inp_name")
      .setLabel("ชื่องาน")
      .setStyle(TextInputStyle.Short),
    new TextInputBuilder()
      .setCustomId("inp_desc")
      .setLabel("รายละเอียด")
      .setStyle(TextInputStyle.Short)
      .setRequired(false),
    new TextInputBuilder()
      .setCustomId("inp_date")
      .setLabel("Deadline")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("เช่น พรุ่งนี้ 10 โมง"),
  ];

  inputs.forEach((input) =>
    modal.addComponents(new ActionRowBuilder().addComponents(input))
  );

  return modal;
};

const buildAddEventModal = () => {
  const modal = new ModalBuilder()
    .setCustomId(CUSTOM_IDS.MODAL_ADD_EVENT)
    .setTitle("📅 เพิ่มกำหนดการ (ส่งไป Sheet)");

  const inputs = [
    new TextInputBuilder()
      .setCustomId("evt_project")
      .setLabel("ชื่อโครงการ (เช่น Rookie SS3)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("ต้องตรงกับชื่อใน Sheet เป๊ะๆ นะ"),
    new TextInputBuilder()
      .setCustomId("evt_task")
      .setLabel("กิจกรรม (เช่น Final Pitching)")
      .setStyle(TextInputStyle.Short),
    new TextInputBuilder()
      .setCustomId("evt_date")
      .setLabel("วันที่ (Format: M/D/YYYY)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("1/1/2569"),
    new TextInputBuilder()
      .setCustomId("evt_tag")
      .setLabel("Color Tag (ระบุสี)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("red, orange, yellow, green, blue, purple"),
  ];

  inputs.forEach((input) =>
    modal.addComponents(new ActionRowBuilder().addComponents(input))
  );

  return modal;
};

// ═══════════════════════════════════════════════════════════════
//  HANDLER: TO-DO LIST
// ═══════════════════════════════════════════════════════════════

const updateDashboard = async () => {
  if (state.dashboardMessage) {
    await state.dashboardMessage.edit({ embeds: [generateDashboardEmbed()] });
  }
};

const handleTodoCommand = async (interaction) => {
  state.dashboardMessage = await interaction.reply({
    embeds: [generateDashboardEmbed()],
    components: [generateDashboardButtons()],
    fetchReply: true,
  });
};

const handleAddTaskButton = async (interaction) => {
  await interaction.showModal(buildAddTaskModal());
};

const handleAddTaskModal = async (interaction) => {
  const name = interaction.fields.getTextInputValue("inp_name");
  const desc = interaction.fields.getTextInputValue("inp_desc") || "-";
  const deadline = interaction.fields.getTextInputValue("inp_date");

  state.tasks.push({
    name,
    desc,
    deadline,
    owner: interaction.user.id,
    status: "pending",
  });

  await updateDashboard();
  await interaction.reply({ content: "✅ เพิ่มงานเรียบร้อย!", ephemeral: true });
};

const handleCompleteButton = async (interaction) => {
  if (state.tasks.length === 0) {
    return interaction.reply({ content: "😅 ไม่มีงานให้แก้ครับ", ephemeral: true });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(CUSTOM_IDS.SELECT_COMPLETE_TASK)
    .setPlaceholder("เลือกงานที่ทำเสร็จแล้ว...")
    .addOptions(
      state.tasks.map((task, index) => ({
        label: `${index + 1}. ${task.name}`,
        description: `ของ ${task.deadline}`,
        value: index.toString(),
      }))
    );

  await interaction.reply({
    components: [new ActionRowBuilder().addComponents(selectMenu)],
    ephemeral: true,
  });
};

const handleCompleteSelect = async (interaction) => {
  const index = parseInt(interaction.values[0]);
  const task = state.tasks[index];

  if (task) {
    task.status = "done";
    await updateDashboard();
  }

  await interaction.update({
    content: `🎉 เยี่ยมมาก! งาน "${task?.name}" เสร็จแล้ว!`,
    components: [],
  });
};

const handleClearButton = async (interaction) => {
  state.tasks = state.tasks.filter((task) => task.status !== "done");
  await updateDashboard();
  await interaction.reply({ content: "🧹 ล้างงานที่เสร็จแล้วเรียบร้อย", ephemeral: true });
};

// ═══════════════════════════════════════════════════════════════
//  HANDLER: EVENT SCHEDULER (n8n Integration)
// ═══════════════════════════════════════════════════════════════

const handleAddEventCommand = async (interaction) => {
  await interaction.showModal(buildAddEventModal());
};

const handleAddEventModal = async (interaction) => {
  const project = interaction.fields.getTextInputValue("evt_project").trim();
  const task = interaction.fields.getTextInputValue("evt_task").trim();
  const date = interaction.fields.getTextInputValue("evt_date").trim();
  const tag = interaction.fields.getTextInputValue("evt_tag").trim();

  await interaction.deferReply();

  try {
    await axios.post(CONFIG.N8N_WEBHOOK_URL, {
      project,
      task,
      date,
      tag,
      user: interaction.user.username,
      userId: interaction.user.id,
    });

    await interaction.editReply({
      embeds: [generateEventSuccessEmbed(project, task, date)],
      components: [generateSheetLinkButton()],
    });
  } catch (error) {
    console.error("Error sending to n8n:", error);
    await interaction.editReply(
      `❌ เกิดข้อผิดพลาด! \n\`${formatErrorMessage(error)}\` \n(เช็ค URL n8n หรือดูว่า Activate Workflow หรือยัง?)`
    );
  }
};

// ═══════════════════════════════════════════════════════════════
//  HANDLER: SCHEDULE SCREENSHOT (Puppeteer)
// ═══════════════════════════════════════════════════════════════

const captureScheduleScreenshot = async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(CONFIG.VIEWPORT);
    await page.goto(CONFIG.SHEET_WEB_URL, { waitUntil: "networkidle0" });

    // Inject Thai font for proper rendering
    await page.addStyleTag({
      content: `@import url('${CONFIG.KANIT_FONT_URL}');`,
    });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    await delay(CONFIG.SCREENSHOT_DELAY_MS);

    return await page.screenshot({ fullPage: true });
  } finally {
    await browser.close();
  }
};

const handleScheduleCommand = async (interaction) => {
  await interaction.deferReply();

  try {
    console.log("📸 กำลังเริ่มถ่ายรูป...");
    const imageBuffer = await captureScheduleScreenshot();

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
  }
};

// ═══════════════════════════════════════════════════════════════
//  HANDLER: MUSIC PLAYER 🎵
// ═══════════════════════════════════════════════════════════════

const generateNowPlayingEmbed = (track) =>
  new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("🎵 กำลังเล่น")
    .setDescription(`**[${track.title}](${track.url})**`)
    .setThumbnail(track.thumbnail || null)
    .addFields(
      { name: "👤 ช่อง", value: track.channel || "Unknown", inline: true },
      { name: "⏱️ ความยาว", value: track.duration || "Unknown", inline: true }
    )
    .setFooter({ text: `ขอโดย ${track.requestedBy || "Unknown"}` });

const generateQueueEmbed = (musicQueue) => {
  const { queue, currentTrack } = musicQueue;

  let description = currentTrack
    ? `**กำลังเล่น:** [${currentTrack.title}](${currentTrack.url}) - \`${currentTrack.duration}\`\n\n`
    : "";

  if (queue.length === 0) {
    description += "📭 ไม่มีเพลงในคิว";
  } else {
    description += "**📜 รายการเพลงถัดไป:**\n";
    description += queue
      .slice(0, 10)
      .map((track, i) => `\`${i + 1}.\` [${track.title}](${track.url}) - \`${track.duration}\``)
      .join("\n");

    if (queue.length > 10) {
      description += `\n\n...และอีก ${queue.length - 10} เพลง`;
    }
  }

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("🎶 คิวเพลง")
    .setDescription(description)
    .setFooter({ text: `รวม ${queue.length} เพลงในคิว` });
};

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// ฟังก์ชันหาเพลงที่เกี่ยวข้องสำหรับ Autoplay
const findRelatedTrack = async (currentTrack) => {
  try {
    // ค้นหาเพลงที่คล้ายกันโดยใช้ชื่อศิลปิน + "เพลง" หรือ genre keywords
    const searchQueries = [
      `${currentTrack.channel} เพลงเพราะ`,
      `${currentTrack.title.split("-")[0]} เพลงคล้าย`,
      `เพลงไทย acoustic cover`,
      `เพลงรัก เพราะๆ`,
    ];

    // สุ่มเลือก query
    const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    console.log(`🔍 Autoplay searching: ${randomQuery}`);

    const results = await YouTube.search(randomQuery, { limit: 10, type: "video" });

    if (!results || results.length === 0) {
      return null;
    }

    // สุ่มเลือกเพลงจากผลลัพธ์ (ไม่เอาเพลงเดิม)
    const filteredResults = results.filter(v => v.url !== currentTrack.url);
    if (filteredResults.length === 0) return null;

    const randomVideo = filteredResults[Math.floor(Math.random() * filteredResults.length)];

    return {
      title: randomVideo.title || "Unknown",
      url: randomVideo.url,
      duration: randomVideo.durationFormatted || "Unknown",
      thumbnail: randomVideo.thumbnail?.url || null,
      channel: randomVideo.channel?.name || "Unknown",
      requestedBy: "🤖 Autoplay",
    };
  } catch (error) {
    console.error("Autoplay search error:", error);
    return null;
  }
};

const playNextTrack = async (guildId) => {
  const musicQueue = getMusicQueue(guildId);
  const { queue, player, connection, textChannel, autoplay, lastTrack } = musicQueue;

  // ═══════════════════════════════════════════════════════════════
  // 🔄 AUTOPLAY LOGIC (แก้ไขใหม่: ใช้ findRelatedTrack)
  // ═══════════════════════════════════════════════════════════════
  if (queue.length === 0 && autoplay && lastTrack) {
    if (textChannel) textChannel.send("🔄 **Autoplay:** กำลังหาเพลงที่คล้ายกัน...");

    try {
      // ✅ เรียกใช้ฟังก์ชัน findRelatedTrack ที่คุณเขียนไว้ด้านบน
      const trackInfo = await findRelatedTrack(lastTrack);

      if (trackInfo) {
        queue.push(trackInfo);
        console.log(`✨ Autoplay found: ${trackInfo.title}`);
        // เมื่อเจอเพลงแล้ว ปล่อยให้โค้ดไหลลงไปข้างล่างเพื่อเล่นเพลงนี้
      } else {
        if (textChannel) textChannel.send("📭 Autoplay หาเพลงไม่เจอแล้วครับ!");
        musicQueue.currentTrack = null;
        return;
      }
    } catch (e) {
      console.error("Autoplay Error:", e);
      musicQueue.currentTrack = null;
      return;
    }
  }
  // ═══════════════════════════════════════════════════════════════

  if (queue.length === 0) {
    musicQueue.currentTrack = null;
    if (textChannel) textChannel.send("📭 เพลงหมดคิวแล้วครับ!");
    return;
  }

  const track = queue.shift();
  musicQueue.currentTrack = track;
  musicQueue.lastTrack = track;

  try {
    if (!track.url) throw new Error("Track URL is undefined");

    console.log(`🎵 กำลังโหลดเพลง (via yt-dlp): ${track.title}`);
    console.log(`🔗 Link: ${track.url}`);

    // 🛠️ FIX: Use yt-dlp for streaming (More stable than play-dl stream)
    const ytDlpProcess = spawn('yt-dlp', [
      '-o', '-',             // Output to stdout
      '-q',                  // Quiet mode
      '-f', 'bestaudio',     // Best audio format
      '--no-warnings',       // Suppress warnings
      '-R', 'infinite',      // Infinite retries
      track.url
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    const resource = createAudioResource(ytDlpProcess.stdout, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true,
    });

    resource.volume?.setVolume(1);
    player.play(resource);

    // Handle yt-dlp errors
    ytDlpProcess.on('error', (error) => {
      console.error("yt-dlp process error:", error);
      if (textChannel) textChannel.send(`❌ เกิดข้อผิดพลาดกับ yt-dlp: ${error.message}`);
      playNextTrack(guildId);
    });

    if (textChannel) {
      textChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00ff00)
            .setDescription(`🎶 เริ่มเล่น: **[${track.title}](${track.url})**`)
            .setThumbnail(track.thumbnail)
            .setFooter({ text: `ขอโดย ${track.requestedBy}` }),
        ],
      });
    }
  } catch (error) {
    console.error("Stream Error:", error);
    if (textChannel) {
      textChannel.send(`❌ ไม่สามารถเล่นเพลง "${track.title}" ได้ - ${error.message}`);
    }
    playNextTrack(guildId);
  }
};

const handlePlayCommand = async (interaction) => {
  const channel = interaction.member?.voice?.channel;

  if (!channel) {
    return interaction.reply({
      content: "❌ คุณต้องอยู่ในห้องเสียงก่อนนะครับ!",
      ephemeral: true,
    });
  }

  // Ensure we have the query option
  const query = interaction.options.getString("query", true);
  await interaction.deferReply();

  try {
    let trackInfo;

    // 1. Validate if the input is a URL or a Search Query
    const validation = await play.validate(query);

    if (validation === "yt_video") {
      // ✅ Case 1: It is a direct YouTube Link
      const videoInfo = await play.video_info(query);
      const video = videoInfo.video_details;

      trackInfo = {
        title: video.title || "Unknown Title",
        url: video.url,
        duration: video.durationRaw || "Unknown",
        thumbnail: video.thumbnails[0]?.url || null,
        channel: video.channel?.name || "Unknown Channel",
        requestedBy: interaction.user.username,
      };

    } else if (validation === "search") {
      // ✅ Case 2: It is a search term
      const searchResults = await play.search(query, {
        limit: 1,
        source: { youtube: "video" }
      });

      if (searchResults.length === 0) {
        return interaction.editReply("❌ ไม่พบเพลงที่ค้นหาครับ ลองใช้คำค้นอื่นดูนะ");
      }

      const video = searchResults[0];

      trackInfo = {
        title: video.title || "Unknown Title",
        url: video.url,
        duration: video.durationRaw || "Unknown",
        thumbnail: video.thumbnails[0]?.url || null,
        channel: video.channel?.name || "Unknown Channel",
        requestedBy: interaction.user.username,
      };

    } else {
      // ❌ Case 3: Invalid input (Not a YT video or valid search)
      return interaction.editReply("❌ รองรับเฉพาะลิงก์ YouTube หรือคำค้นหาเท่านั้นครับ (Playlist ยังไม่รองรับในเวอร์ชันนี้)");
    }

    // 2. Setup Music Queue & Voice Connection
    const musicQueue = getMusicQueue(interaction.guildId);
    musicQueue.textChannel = interaction.channel;

    // Connect if not already connected
    if (!musicQueue.connection || musicQueue.connection.state.status === VoiceConnectionStatus.Destroyed) {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        console.log("✅ Voice connection ready!");
      } catch (error) {
        connection.destroy();
        console.error("Connection Error:", error);
        return interaction.editReply("❌ ไม่สามารถเชื่อมต่อห้องเสียงได้ (Timeout)");
      }

      const audioPlayer = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });

      // Event Listeners for Player
      audioPlayer.on(AudioPlayerStatus.Idle, () => {
        console.log("🔄 Player idle, playing next track...");
        playNextTrack(interaction.guildId);
      });

      audioPlayer.on(AudioPlayerStatus.Playing, () => {
        console.log("▶️ Player is now playing");
      });

      audioPlayer.on("error", (error) => {
        console.error("Audio Player Error:", error);
        // If player crashes, try next song
        playNextTrack(interaction.guildId);
      });

      connection.subscribe(audioPlayer);

      // Handle Manual Disconnects
      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5000),
          ]);
        } catch (error) {
          connection.destroy();
          musicQueues.delete(interaction.guildId);
        }
      });

      musicQueue.connection = connection;
      musicQueue.player = audioPlayer;
    }

    // 3. Add to Queue or Play Immediately
    if (musicQueue.currentTrack) {
      // If something is already playing, add to queue
      musicQueue.queue.push(trackInfo);
      await interaction.editReply({
        content: `✅ เพิ่มเพลงลงคิวแล้ว! (ลำดับที่ ${musicQueue.queue.length})`,
        embeds: [generateNowPlayingEmbed(trackInfo)],
      });
    } else {
      // If queue is empty, play immediately
      musicQueue.queue.push(trackInfo);
      await interaction.editReply({
        content: `✅ กำลังเล่นเพลง!`,
        embeds: [generateNowPlayingEmbed(trackInfo)],
      });
      playNextTrack(interaction.guildId);
    }

  } catch (error) {
    console.error("Play Command Error:", error);
    await interaction.editReply(
      `❌ เกิดข้อผิดพลาดในการเล่นเพลง: \`${error.message}\``
    );
  }
};

const handleSkipCommand = async (interaction) => {
  const musicQueue = getMusicQueue(interaction.guildId);

  if (!musicQueue.currentTrack) {
    return interaction.reply({ content: "❌ ไม่มีเพลงกำลังเล่นอยู่ครับ", ephemeral: true });
  }

  const currentTrack = musicQueue.currentTrack;
  musicQueue.player?.stop();

  await interaction.reply(`⏭️ ข้ามเพลง **${currentTrack?.title}** แล้วครับ!`);
};

const handleStopCommand = async (interaction) => {
  const musicQueue = getMusicQueue(interaction.guildId);

  if (!musicQueue.connection) {
    return interaction.reply({ content: "❌ ไม่มีเพลงกำลังเล่นอยู่ครับ", ephemeral: true });
  }

  musicQueue.queue = [];
  musicQueue.currentTrack = null;
  musicQueue.player?.stop();
  musicQueue.connection?.destroy();
  musicQueues.delete(interaction.guildId);

  await interaction.reply("⏹️ หยุดเล่นเพลงและออกจากห้องแล้วครับ!");
};

const handleQueueCommand = async (interaction) => {
  const musicQueue = getMusicQueue(interaction.guildId);

  if (!musicQueue.currentTrack && musicQueue.queue.length === 0) {
    return interaction.reply({ content: "❌ ไม่มีเพลงในคิวครับ", ephemeral: true });
  }

  await interaction.reply({ embeds: [generateQueueEmbed(musicQueue)] });
};

const handlePauseCommand = async (interaction) => {
  const musicQueue = getMusicQueue(interaction.guildId);

  if (!musicQueue.player || !musicQueue.currentTrack) {
    return interaction.reply({ content: "❌ ไม่มีเพลงกำลังเล่นอยู่ครับ", ephemeral: true });
  }

  musicQueue.player.pause();
  await interaction.reply("⏸️ หยุดเพลงชั่วคราวแล้วครับ!");
};

const handleResumeCommand = async (interaction) => {
  const musicQueue = getMusicQueue(interaction.guildId);

  if (!musicQueue.player) {
    return interaction.reply({ content: "❌ ไม่มีเพลงในคิวครับ", ephemeral: true });
  }

  musicQueue.player.unpause();
  await interaction.reply("▶️ เล่นเพลงต่อแล้วครับ!");
};

const handleAutoplayCommand = async (interaction) => {
  const musicQueue = getMusicQueue(interaction.guildId);

  // Toggle autoplay
  musicQueue.autoplay = !musicQueue.autoplay;

  const status = musicQueue.autoplay ? "เปิด" : "ปิด";
  const emoji = musicQueue.autoplay ? "🔄" : "⏹️";
  const color = musicQueue.autoplay ? 0x00ff00 : 0xff0000;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} Autoplay: ${status}`)
    .setDescription(
      musicQueue.autoplay
        ? "เมื่อเพลงหมดคิว บอทจะหาเพลงที่คล้ายกันมาเล่นต่อให้อัตโนมัติ 🎵"
        : "บอทจะหยุดเล่นเมื่อเพลงหมดคิว"
    );

  await interaction.reply({ embeds: [embed] });
};

// ═══════════════════════════════════════════════════════════════
//  INTERACTION ROUTER
// ═══════════════════════════════════════════════════════════════

const commandHandlers = {
  todo: handleTodoCommand,
  addevent: handleAddEventCommand,
  schedule: handleScheduleCommand,
  play: handlePlayCommand,
  skip: handleSkipCommand,
  stop: handleStopCommand,
  queue: handleQueueCommand,
  pause: handlePauseCommand,
  resume: handleResumeCommand,
  autoplay: handleAutoplayCommand,
};

const buttonHandlers = {
  [CUSTOM_IDS.BTN_ADD]: handleAddTaskButton,
  [CUSTOM_IDS.BTN_COMPLETE]: handleCompleteButton,
  [CUSTOM_IDS.BTN_CLEAR]: handleClearButton,
};

const modalHandlers = {
  [CUSTOM_IDS.MODAL_ADD_TASK]: handleAddTaskModal,
  [CUSTOM_IDS.MODAL_ADD_EVENT]: handleAddEventModal,
};

const selectMenuHandlers = {
  [CUSTOM_IDS.SELECT_COMPLETE_TASK]: handleCompleteSelect,
};

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const handler = commandHandlers[interaction.commandName];
      if (handler) await handler(interaction);
    }

    if (interaction.isButton()) {
      const handler = buttonHandlers[interaction.customId];
      if (handler) await handler(interaction);
    }

    if (interaction.isModalSubmit()) {
      const handler = modalHandlers[interaction.customId];
      if (handler) await handler(interaction);
    }

    if (interaction.isStringSelectMenu()) {
      const handler = selectMenuHandlers[interaction.customId];
      if (handler) await handler(interaction);
    }
  } catch (error) {
    console.error("Interaction Error:", error);
  }
});

// ═══════════════════════════════════════════════════════════════
//  BOT STARTUP
// ═══════════════════════════════════════════════════════════════

client.once(Events.ClientReady, (c) => {
  console.log(`🤖 บอทพร้อมทำงานแล้วในร่าง: ${c.user.tag}`);
});

client.login(process.env.TOKEN);
