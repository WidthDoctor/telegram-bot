// npm run dev
const token = "7122702562:AAFcNto8K7YTBf3NOQhB51q5LRYImjZXLlM";
const telegramApi = require("node-telegram-bot-api");
const bot = new telegramApi(token, { polling: true });

class NewBot {
  constructor() {}

  // Пустой метод 1
  commands() {
    bot.on("message", (userInput) => {
      const text = userInput.text;
      const chatId = userInput.chat.id;
      switch (text) {
        case "/start":
          bot.sendMessage(
            chatId,
            `Привет, ${userInput.from.first_name}! Выберите язык:`,
            {
              reply_markup: this.languageButtons(),
            }
          );
          this.language(chatId);
          break;

        default:
          break;
      }
    });
  }
  botSpeak(text, chatId) {
    bot.sendMessage(chatId, text);
  }
  language(chatId) {
    bot.on("callback_query", (userInput) => {
      const languageButton = userInput.data;
      console.log(userInput.data);
      switch (languageButton) {
        case "EN":
          this.botSpeak("English language selected", chatId);
          break;
        case "RUS":
          this.botSpeak("Выбран русский язык!", chatId);
          break;
        case "PL":
          this.botSpeak("Wybrano język Polski", chatId);
          break;
        case "UKR":
          this.botSpeak("Обрано Українську мову", chatId);
          break;
        default:
          break;
      }
    });
  }
  languageButtons() {
    return JSON.stringify({
      inline_keyboard: [
        [
          { text: "English", callback_data: "EN" },
          { text: "Русский", callback_data: "RUS" },
        ],
        [
          { text: "Українська", callback_data: "UKR" },
          { text: "Polska", callback_data: "PL" },
        ],
      ],
    });
  }
}
const myBot = new NewBot(); // Создаем экземпляр класса
myBot.commands();
