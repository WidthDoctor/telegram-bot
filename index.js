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
  async currentCource(city, userId) {
    // console.log(city+ 'пришел в валютник');
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
      const action = callbackQuery.data;
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id;

      const usersBaseData = fs.readFileSync("usersBase.json");
      const usersBase = JSON.parse(usersBaseData);
      const user = usersBase.find((user) => user.userId === userId);
      const userLanguage = user.language;

      const questionsData = fs.readFileSync("questions.json");
      const questions = JSON.parse(questionsData);

      const messageCity = questions[userLanguage].city;
      const messageContactQuestion = questions[userLanguage].contactQuestion;
      const ALL_citiesJSON = questions.citiesLanguage;
      const citiesKeys = ALL_citiesJSON.flatMap((cityObj) =>
        Object.values(cityObj)
      );
      // Обработка событий в зависимости от значения callback_data
      switch (action) {
        case "kurs":
          bot.sendMessage(userId, messageCity, {
            reply_markup: this.selectCity(userLanguage),
          });
          break;
        case "contact":
          bot.sendMessage(userId, messageContactQuestion, {
            reply_markup: this.selectCityForContact(userLanguage),
          });
          break;
        case "actual":
          bot.sendMessage(userId, this.actualMultitul(userLanguage), { parse_mode: 'HTML' });
          // console.log(action, chatId);
          break;
        case "about":
          let msg = this.sendAboutInfo(userLanguage);
          bot.sendMessage(userId, msg);
          // console.log(action, chatId);
          break;
        default:
          if (citiesKeys.includes(action)) {
            this.currentCource(action, userId);
          }
          if (citiesKeys.includes(action) + "Tel") {
            // console.log(action);
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
    console.log(userInput);
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
          { text: startOverText, callback_data: "about" },
        ],
      ],
    };
  }
  sendCurrentRate(rate, userId) {
    const usersBaseData = fs.readFileSync("usersBase.json");
    const usersBase = JSON.parse(usersBaseData);
    const user = usersBase.find((user) => user.userId === userId);
    const language = user.language;

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
    const actualCurseMsg = {
      ru: "Актуальный курс на данный момент:",
      en: "Current exchange rate at the moment:",
      pl: "Aktualny kurs na chwilę obecną:",
    };
    bot.sendMessage(userId, actualCurseMsg[language], {
      reply_markup: JSON.stringify({ inline_keyboard: buttons }),
    });

    // Возвращаем массив кнопок
    // console.log(JSON.stringify({ inline_keyboard: buttons }));
    return JSON.stringify({ inline_keyboard: buttons });
  }
  sendContactsForUser(action, userId) {
    // console.log("соси письку", action);
    switch (
      action //!эти кейсы тоже надо думать
    ) {
      case "KrakowTel":
      case "КраковTel":
      case "KrakówTel":
        bot.sendContact(userId, "+1231231231", "Manager Krakow");

        break;
      case "WrocławTel":
      case "ВроцлавTel":
      case "WroclawTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "PrzemyslTel":
      case "PrzemyślTel":
      case "ПшемысльTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "GdanskTel":
      case "GdańskTel":
      case "ГданьскTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "LodzTel":
      case "ŁódźTel":
      case "ЛодзьTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "WarszawaTel":
      case "ВаршаваTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "KrakowPKPTel":
      case "Kraków PKPTel":
      case "Краков ПКПTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "RzeszowTel":
      case "RzeszówTel":
      case "ЖешувTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "PoznanTel":
      case "PoznańTel":
      case "ПознаньTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "LublinTel":
      case "ЛюблинTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;
      case "SzczecinTel":
      case "ЩецинTel":
        bot.sendContact(userId, "+1234567890", "Don Perdole");

        break;

      default:
        break;
    }
  }
  selectCity(userLanguage) {
    const questionsData = fs.readFileSync("questions.json");
    const questions = JSON.parse(questionsData);

    const citiesData = questions.citiesLanguage;
    const cities = citiesData.flatMap((cityObj) => cityObj[userLanguage]);
    const buttons = cities.map((city) => ({
      text: city,
      callback_data: city, // или можно указать другие данные обратного вызова, если это необходимо
    }));
    // Разбиваем кнопки на массивы, каждый из которых содержит не более трех кнопок
    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 3) {
      inlineKeyboard.push(buttons.slice(i, i + 3));
    }
    return { inline_keyboard: inlineKeyboard };
  }
  selectCityForContact(userLanguage) {
    const questionsData = fs.readFileSync("questions.json");
    const questions = JSON.parse(questionsData);

    const citiesData = questions.citiesLanguage;
    const cities = citiesData.flatMap((cityObj) => cityObj[userLanguage]);
    const buttons = cities.map((city) => ({
      text: city,
      callback_data: city + "Tel", // или можно указать другие данные обратного вызова, если это необходимо
    }));
    // Разбиваем кнопки на массивы, каждый из которых содержит не более трех кнопок
    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 3) {
      inlineKeyboard.push(buttons.slice(i, i + 3));
    }
    return { inline_keyboard: inlineKeyboard };
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
  sendAboutInfo(language) {
    const AboutMSG = questions.aboutUs[language];
    return AboutMSG;
  }
  actualMultitul(language){
    return this.firstNewsPaper(language)
  }
  firstNewsPaper(language){
    const paymentInfo = {
      ru: "<b>Оплата картой</b> 💳\nУважаемые клиенты, с радостью сообщаем вам, что теперь вы можете обменивать свои деньги с помощью банковской карты.\nЭта транзакция будет включать минимальную плату:\nПольская карта - 1,0% от курса продажи\nИностранная карта - 3,0% от курса продажи\n(Лимит единиц транзакций 1000)",
      en: "<b>Card Payment</b> 💳\nDear Customers, we are pleased to inform you that you can now exchange your money using a debit/credit card.\nThis transaction will incur a minimum fee:\nPolish card - 1.0% to the selling rate\nForeign card - 3.0% to the selling rate\n(Transaction units limit 1000)",
      pl: "<b>Płatność kartą</b> 💳\nSzanowni Klienci, z przyjemnością informujemy, że od teraz możesz wymieniać swoje pieniądze za pomocą karty płatniczej.\nTa transakcja będzie podlegać minimalnej opłacie:\nKarta polska - 1,0% do kursu sprzedaży\nKarta zagraniczna - 3,0% do kursu sprzedaży\n(Limit jednostek transakcji 1000)"
    };
    return paymentInfo[language];
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
