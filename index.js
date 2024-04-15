// npm run dev
const token = "7122702562:AAFcNto8K7YTBf3NOQhB51q5LRYImjZXLlM";
const fs = require("fs");
const telegramApi = require("node-telegram-bot-api");
const bot = new telegramApi(token, { polling: true });
const cheerio = require("cheerio");
const questions = require("./questions.json");
let language = "";
class NewBot {
  constructor() {
    this.usersBaseFilePath = "usersBase.json";
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
  } //курс кракова
  commands() {
    bot.on("message", (userInput) => {
      const text = userInput.text;
      const chatId = userInput.chat.id;
      const userLanguage = userInput.from.language_code;
      switch (text) {
        case "/start":
          console.log(userInput.from.language_code);
          this.saveUser(userInput);
          this.gotoPrivateChat(userInput);
          break;

        default:
          break;
      }
    });
    bot.on("callback_query", (callbackQuery) => {
      console.log(callbackQuery);
      const action = callbackQuery.data;
      const chatId = callbackQuery.message.chat.id;

      // Обработка событий в зависимости от значения callback_data
      switch (action) {
        case "city":
          // Обработка для "city"
          break;
        case "contact":
          // Обработка для "contact"
          break;
        case "actual":
          // Обработка для "actual"
          break;
        case "again":
          // Обработка для "again"
          break;
        default:
          // Действие по умолчанию, если callback_data не распознан
          break;
      }
    });

  }
  async gotoPrivateChat(userInput) {
    try {
      const userId = userInput.from.id;
      const chatId = userInput.chat.id;

      const usersBaseData = fs.readFileSync("usersBase.json");
      const usersBase = JSON.parse(usersBaseData);

      const user = usersBase.find((user) => user.userId === userId);

      if (!user) {
        return; // Прерываем выполнение функции, если пользователь не найден в базе данных
      }

      const userLanguage = user.language;
      const questionsData = fs.readFileSync("questions.json");
      const questions = JSON.parse(questionsData);

      const startMessage = questions[userLanguage].start;
      const startMessageInBot = questions[userLanguage].startIn
      if (userId === chatId) {
        await bot.sendMessage(userId, startMessageInBot, {
          reply_markup: this.kantorMenu(userLanguage),
        });
      }
      if (userId !== chatId) {
        await bot.sendMessage(userId, startMessage, {
          reply_markup: this.kantorMenu(userLanguage),
        });
      }
    } catch (error) {
      console.error("Произошла ошибка в методе gotoPrivateChat:", error);
    }
  }
  async saveUser(userInput) {
    try {
      const { first_name, last_name, username, id, language_code } =
        userInput.from;
      const userId = id;

      let usersBase = [];

      // Проверяем существует ли файл JSON и читаем его содержимое
      if (fs.existsSync(this.usersBaseFilePath)) {
        const usersBaseData = fs.readFileSync(this.usersBaseFilePath);

        // Проверяем, не пуст ли файл JSON
        if (usersBaseData.length > 0) {
          usersBase = JSON.parse(usersBaseData);
        }
      }

      // Проверяем, есть ли уже пользователь с таким userId
      const existingUserIndex = usersBase.findIndex(
        (user) => user.userId === userId
      );
      if (existingUserIndex !== -1) {
        // Проверяем, есть ли изменения в данных пользователя
        const existingUser = usersBase[existingUserIndex];
        const updatedUser = {
          username: username || first_name || last_name || "Unknown",
          userId,
          language: language_code,
        };

        // Если есть изменения, обновляем данные пользователя в базе данных
        if (
          existingUser.username !== updatedUser.username ||
          existingUser.language !== updatedUser.language
        ) {
          usersBase[existingUserIndex] = updatedUser;

          // Записываем обновленные данные в файл JSON
          fs.writeFileSync(
            this.usersBaseFilePath,
            JSON.stringify(usersBase, null, 2)
          );

          // console.log("Данные пользователя успешно обновлены в базе данных.");
        } else {
          // console.log("Нет изменений в данных пользователя.");
        }

        return; // Прерываем выполнение функции
      }

      // Добавление нового пользователя в массив
      usersBase.push({
        username: username || first_name || last_name || "Unknown",
        userId,
        language: language_code,
      });

      // Запись обновленных данных в файл JSON
      fs.writeFileSync(
        this.usersBaseFilePath,
        JSON.stringify(usersBase, null, 2)
      );

      // console.log("Пользователь успешно добавлен в базу данных.");
    } catch (error) {
      console.error("Произошла ошибка при сохранении пользователя:", error);
    }
  }

  kantorMenu(language) {
    const questionsData = fs.readFileSync("questions.json");
    const questions = JSON.parse(questionsData);
    const kursText = questions[language].options[0];
    const contactText = questions[language].options[1];
    const actualText = questions[language].options[2];
    const startOverText = questions[language].options[3];

    return {
      inline_keyboard: [
        [
          { text: kursText, callback_data: "kurs" },
          { text: contactText, callback_data: "contact" },
        ],
        [
          { text: actualText, callback_data: "actual" },
          { text: startOverText, callback_data: "again" },
        ],
      ],
    };
  }



  // languageButtons() {
  //   return JSON.stringify({
  //     inline_keyboard: [
  //       [
  //         { text: "English", callback_data: "EN" },
  //         { text: "Русский", callback_data: "RUS" },
  //       ],
  //       [
  //         { text: "Українська", callback_data: "UKR" },
  //         { text: "Polska", callback_data: "PL" },
  //       ],
  //     ],
  //   });
  // } //? МОЖЕТ ПОД ЧТО-ТО ДРУГОЕ ЭТИ КНОПКИ ПОЙДУТ КАК ШАБЛОН
}

const myBot = new NewBot(); // Создаем экземпляр класса
myBot.commands();
// myBot.cerrentCource();
