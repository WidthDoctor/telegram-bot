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
  async currentCource(city, userId) {//! надо менять cityUrl на города что могут быть там или нихуя не будет работать
    console.log(city+ 'пришел в валютник');
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
      this.sendCurrentRate(currencyRates, userId);
    } catch (error) {
      console.error("Произошла ошибка:", error);
    }
  } //курс
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
      console.log(action);
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
      const messageContactQuestion = questions[userLanguage].contactQuestion;
      const ALL_cities = questions.cities;
      // const questionAboutCity =
      // Обработка событий в зависимости от значения callback_data
      switch (action) {
        case "kurs":
          bot.sendMessage(userId, messageCity, {
            reply_markup: this.selectCity(userLanguage),
          });
          break;
        case "contact":
          bot.sendMessage(userId, messageContactQuestion, {
            reply_markup: this.selectCityForContact(),
          });
          break;
        case "actual":
          console.log(action, chatId);
          break;
        case "again":
          console.log(action, chatId);
          break;
        default:
          if (ALL_cities.includes(action)) {
            this.currentCource(action, userId);
            // const result = this.sendCurrentRate();
            // bot.sendMessage(userId,"actual kurs", {reply_markup: result});
          }
          if (ALL_cities.includes(action) + "Tel") {
            console.log(action);
            this.sendContactsForUser(action, userId);
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
    bot.sendMessage(userId, "Актуальный курс на данный момент:", {
      reply_markup: JSON.stringify({ inline_keyboard: buttons }),
    });

    // Возвращаем массив кнопок
    console.log(JSON.stringify({ inline_keyboard: buttons }));
    return JSON.stringify({ inline_keyboard: buttons });
  }
  sendContactsForUser(action, userId) {
    console.log("соси письку", action);
    switch (action) {
      case "KrakowTel":
        bot.sendContact(userId, "+1231231231", "Manager Krakow");

        break;
      case "WroclawTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "PrzemyslTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "GdanskTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "LodzTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "WarszawaTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "KrakowPKPTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "RzeszowTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "PoznanTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "LublinTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "SzczecinTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;

      default:
        break;
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
  selectCity(userLanguage) {
    const questionsData = fs.readFileSync("questions.json");
    const questions = JSON.parse(questionsData);

    const citiesData = questions.citiesLanguage;
    const cities = citiesData.map((cityObj) => cityObj[userLanguage]);

    const buttons = cities.map((city) => ({
      text: city,
      callback_data: city, // или можно указать другие данные обратного вызова, если это необходимо
    }));
    const ALL_cities = [].concat(
      ...citiesData.map((cityObj) => Object.values(cityObj))
    );
    console.log(ALL_cities);
    // Разбиваем кнопки на массивы, каждый из которых содержит не более трех кнопок
    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 3) {
      inlineKeyboard.push(buttons.slice(i, i + 3));
    }
    return { inline_keyboard: inlineKeyboard };
  }

  selectCityForContact() { //! а тут хуйня потому что тут прописано ручками и поэтому он не вдупляет города новые..
    return {
      inline_keyboard: [
        [
          { text: "Krakow", callback_data: "KrakowTel" },
          { text: "Wroclaw", callback_data: "WroclawTel" },
        ],
        [
          { text: "Przemysl", callback_data: "PrzemyslTel" },
          { text: "Gdansk", callback_data: "GdanskTel" },
        ],
        [
          { text: "Lodz", callback_data: "LodzTel" },
          { text: "Warszawa", callback_data: "WarszawaTel" },
        ],
        [
          { text: "KrakowPKP", callback_data: "KrakowPKPTel" },
          { text: "Rzeszow", callback_data: "RzeszowTel" },
        ],
        [
          { text: "Poznan", callback_data: "PoznanTel" },
          { text: "Lublin", callback_data: "LublinTel" },
        ],
        [{ text: "Szczecin", callback_data: "SzczecinTel" }],
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
