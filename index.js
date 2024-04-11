// npm run dev
const token = "7122702562:AAFcNto8K7YTBf3NOQhB51q5LRYImjZXLlM";
const telegramApi = require("node-telegram-bot-api");
const bot = new telegramApi(token, { polling: true });
const cheerio = require("cheerio");
const questions = require('./questions.json');
var language = "";
class NewBot {
  constructor() {
    this.languageHandlerAdded = false;
  }
  async cerrentCource() {
    try {
      const fetchModule = await import("node-fetch");
      const fetch = fetchModule.default;
      const response = await fetch("https://kantor1913.pl/wszystkie-waluty");
      const html = await response.text();

      const $ = cheerio.load(html); // Загружаем HTML с помощью Cheerio

      const currencyRates = {}; // Создаем объект для хранения курсов валют

      $("span.kurs").each((index, element) => {
        const id = $(element).attr("id");
        const content = $(element).text();

        // Разделяем id по символу подчеркивания и создаем соответствующий объект
        const [currencyId, exchangeType] = id.split("_");
        if (!currencyRates[currencyId]) {
          currencyRates[currencyId] = {}; // Создаем объект для курсов для данной валюты
        }
        currencyRates[currencyId][exchangeType] = content;
      });

      console.log(currencyRates);
    } catch (error) {
      console.error("Произошла ошибка:", error);
    }
  }
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
          if (!this.languageHandlerAdded) {
            this.language(chatId);
            this.languageHandlerAdded = true; // Устанавливаем флаг в true, чтобы указать, что обработчик событий был добавлен
          }
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
    bot.on("callback_query", async (userInput) => {
      const languageButton = userInput.data;
      console.log(userInput.data);
      this.deleteBotAndUserMSG(chatId, userInput)
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
          language ='UKR'
          break;
        default:
          break;
      }
    });
  }
  async deleteBotMSG(chatId,userInput) {
    try {
      await bot.deleteMessage(chatId, userInput.message.message_id);
    } catch (error) {
      console.error("Ошибка при удалении текущего сообщения:", error);
    }
  }
  async deleteBotAndUserMSG(chatId, userInput) {
    try {
        await bot.deleteMessage(chatId, userInput.message.message_id);
        await bot.deleteMessage(chatId, userInput.message.message_id - 1);
    } catch (error) {
        console.error("Ошибка при удалении сообщений:", error);
    }
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
  kantorMenu() {
    return JSON.stringify({
      inline_keyboard: [
        [
          { text: "", callback_data: "EN" },
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
// myBot.cerrentCource();
