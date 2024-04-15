// npm run dev
const token = "7122702562:AAFcNto8K7YTBf3NOQhB51q5LRYImjZXLlM";
const fs = require("fs");
const telegramApi = require("node-telegram-bot-api");
const bot = new telegramApi(token, { polling: true });
const cheerio = require("cheerio");
const questions = require("./questions.json");
const { log } = require("console");
let language = "";
class NewBot {
  constructor() {
    this.usersBaseFilePath = "usersBase.json";
  }
  async currentCource(city,userId) {
    const questionsData = fs.readFileSync("questions.json");
    const questions = JSON.parse(questionsData);
    const cityURL = questions.cityURL[city];
    try {
      const fetchModule = await import("node-fetch");
      const fetch = fetchModule.default;
      const response = await fetch(cityURL);
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

      // console.log(currencyRates); //!JSON!
      this.sendCurrentRate(currencyRates,userId);
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
          // console.log(userInput.from.language_code);
          this.saveUser(userInput);
          this.gotoPrivateChat(userInput);
          break;

        default:
          break;
      }
    });
    bot.on("callback_query", (callbackQuery) => {
      // console.log(callbackQuery);
      const action = callbackQuery.data;
      // console.log(action);
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id;

      const usersBaseData = fs.readFileSync("usersBase.json");
      const usersBase = JSON.parse(usersBaseData);
      const user = usersBase.find((user) => user.userId === userId);

      const questionsData = fs.readFileSync("questions.json");
      const questions = JSON.parse(questionsData);
      const userLanguage = user.language;

      const messageCity = questions[userLanguage].city;
      const ALL_cities = questions.cities;
      // const questionAboutCity =
      // Обработка событий в зависимости от значения callback_data
      switch (action) {
        case "kurs":
          bot.sendMessage(userId, messageCity, {
            reply_markup: this.selectCity(),
          });
          break;
        case "contact":
          console.log(action, chatId);
          break;
        case "actual":
          console.log(action, chatId);
          break;
        case "again":
          console.log(action, chatId);
          break;
        default:
          if (ALL_cities.includes(action)) {
            // console.log(action);
            this.currentCource(action,userId);
            // const result = this.sendCurrentRate();
            // bot.sendMessage(userId,"actual kurs", {reply_markup: result});

          }
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
      const startMessageInBot = questions[userLanguage].startIn;
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
  sendCurrentRate(rate, userId) {
    const buttons = Object.entries(rate).map(([currency, rates]) => {
        let buttonLabel = "";
        // Добавляем эмодзи флага страны и код валюты
        buttonLabel += this.getCountryEmoji(currency) + " " + currency;
        // Добавляем данные о покупке и продаже, если они доступны
        if (rates.dk && rates.ds) {
            buttonLabel += ` —    💵 ${rates.dk} 💴 ${rates.ds}`;
        }
        return [{ text: buttonLabel, callback_data: currency }];
    });

    // Отправляем сообщение с кнопками пользователю
    bot.sendMessage(userId, "Выберите валюту и будет выполнена связь с менеджером", {
        reply_markup: JSON.stringify({ inline_keyboard: buttons })
    });

    // Возвращаем массив кнопок
    console.log(JSON.stringify({ inline_keyboard: buttons }));
    return JSON.stringify({ inline_keyboard: buttons });
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
  selectCity() {
    return {
      inline_keyboard: [
        [
          { text: "Krakow", callback_data: "Krakow" },
          { text: "Wroclaw", callback_data: "Wroclaw" },
        ],
        [
          { text: "Przemysl", callback_data: "Przemysl" },
          { text: "Gdansk", callback_data: "Gdansk" },
        ],
        [
          { text: "Lodz", callback_data: "Lodz" },
          { text: "Warszawa", callback_data: "Warszawa" },
        ],
        [
          { text: "KrakowPKP", callback_data: "KrakowPKP" },
          { text: "Rzeszow", callback_data: "Rzeszow" },
        ],
        [
          { text: "Poznan", callback_data: "Poznan" },
          { text: "Lublin", callback_data: "Lublin" },
        ],
        [{ text: "Szczecin", callback_data: "Szczecin" }],
      ],
    };
  }
  getCountryEmoji(countryCode) {
    // Примеры эмодзи флагов
    const flagEmojis = {
      EUR: "🇪🇺",
      USD: "🇺🇸",
      GBP: "🇬🇧",
      CHF: "🇨🇭",
      ILS: "🇮🇱",
      CNY: "🇨🇳",
      TRY: "🇹🇷",
      CAD: "🇨🇦",
      AUD: "🇦🇺",
      NOK: "🇳🇴",
      SEK: "🇸🇪",
      CZK: "🇨🇿",
      HUF: "🇭🇺",
      HKD: "🇭🇰",
      ISK: "🇮🇸",
      JPY: "🇯🇵",
      AED: "🇦🇪",
    };

    return flagEmojis[countryCode] || "";
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
