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
    bot.setMyCommands([
      { command: "/start", description: "Menu" },
      { command: "/contact", description: "Contacts" },
    ]);
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
      // console.log(text);
      const chatId = userInput.from.id;
      const userLanguage = userInput.from.language_code;
      switch (text) {
        case "/start":
          case "/start@SuperKantorBot":
            // this.KONTROL_PANEL(userInput,text);
          // console.log(userInput.from.language_code);
                // находим пользователя
      const userId = userInput.from.id;
      const usersBaseData = fs.readFileSync("usersBase.json");
      const usersBase = JSON.parse(usersBaseData);
      const user = usersBase.find((user) => user.userId === userId);
      if (!user) {//чекаем есть ли юзер в базе данных

        this.setLanguageMenu(userInput);
      }
          this.gotoPrivateChat(userInput);

          break;
        case "/contact":
        case "/contact@SuperKantorBot":
          const questionsData = fs.readFileSync("questions.json");
          const questions = JSON.parse(questionsData);
          const messageContactQuestion =
            questions[userLanguage].contactQuestion;
          bot.sendMessage(chatId, messageContactQuestion, {
            reply_markup: this.selectCityForContact(userLanguage),
          });
          break;
        default:
          this.KONTROL_PANEL(userInput,text);
          break;
      }
    });
    bot.on("callback_query", (callbackQuery) => {
      console.log(callbackQuery);
      const action = callbackQuery.data;
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id;

      const usersBaseData = fs.readFileSync("usersBase.json");
      const usersBase = JSON.parse(usersBaseData);
      const user = usersBase.find((user) => user.userId === userId);
      const userLanguage = user.language;

      const questionsData = fs.readFileSync("questions.json");
      const questions = JSON.parse(questionsData);
      console.log(action);

      const messageCity = questions[userLanguage].city;
      const messageContactQuestion = questions[userLanguage].contactQuestion;
      const ALL_citiesJSON = questions.citiesLanguage;
      const citiesKeys = ALL_citiesJSON.flatMap((cityObj) =>
        Object.values(cityObj)
      );
      // Обработка событий в зависимости от значения callback_data
      switch (text) {
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
          bot.sendMessage(userId, this.actualMultitul(userLanguage), {
            parse_mode: "HTML",
          });
          console.log(action, chatId);
          break;
        case "about":
          let msg = this.sendAboutInfo(userLanguage);
          bot.sendMessage(userId, msg);
          // console.log(action, chatId);
          break;
        case "address":
          console.log(action, chatId);
          bot.sendMessage(userId, messageCity, {
            reply_markup: this.sendAddressMenu(userLanguage),
          });
          break;
        default:
          if (citiesKeys.includes(action)) {
            this.currentCource(action, userId);
          }
          if (citiesKeys.includes(action) + "Tel") {
            // console.log(action);
            this.sendContactsForUser(action, userId);
          }
          if (citiesKeys.includes(action) + "ADD") {
            console.log(action);
            this.sendAddressMSG(action, userId);
          }
          break;
      }
    });
    bot.onText(/.*/, (msg) => {
      const chatId = -1002111886632; // ID чата, из которого нужно удалять сообщения
      const messagesToDelete = [
        "/contact@SuperKantorBot",
        "/start@SuperKantorBot",
        "/contact",
        "/start",
      ];
      const message = msg.text;
      const messageId = msg.message_id;

      if (chatId === msg.chat.id && messagesToDelete.includes(message)) {
        bot.deleteMessage(chatId, messageId).catch((error) => {
          console.error("Error deleting message:", error.response.body);
        });
      }
    });
  }
  KONTROL_PANEL(userInput,text){
    // console.log(text + ' вот шляпа');
    switch (text) {
      case '🇷🇺 Русский':
          this.saveUser(userInput, 'ru');
          break;
      case '🇺🇸 English':
          console.log('Выбран язык 🇺🇸 ' + text);
          this.saveUser(userInput, 'en');
          break;
      case '🇵🇱 Polska':
          console.log('Выбран язык 🇵🇱 ' + text);
          this.saveUser(userInput, 'pl');
          break;
        case text.match(/💱/i) ? text : null:
      console.log('да это ебать курс валют');
        break;
      default:
          break;
  }
}
  setLanguageMenu(userInput){
    const keyboard = [
      [
        { text: '🇺🇸 English'},
        { text: '🇵🇱 Polska'},
        { text: '🇷🇺 Русский'}
      ]
  ];
        const chatId = userInput.chat.id;

            // Отправка сообщения с клавиатурой
            bot.sendMessage(chatId, 'Choose a language:', {
                reply_markup: {
                    keyboard: keyboard,
                    resize_keyboard: true,  // Можете убрать, если не требуется
                    one_time_keyboard: true  // Можете убрать, если не требуется
                }
            })
            .then(() => {
                console.log('Клавиатура успешно отправлена.');
            })
            .catch((error) => {
                console.error('Ошибка при отправке клавиатуры:', error);
            });
        }
  async gotoPrivateChat(userInput) {
    try {
      const chatId = userInput.chat.id;

      // находим пользователя
      const userId = userInput.from.id;
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
          // reply_markup: this.kantorMenu(userLanguage),
        });
      }
    } catch (error) {
      console.error("Произошла ошибка в методе gotoPrivateChat:", error);
    }
  }
  saveUser(userInput, languageCode) {
    console.log(languageCode + ' save работает');
    try {
        const { first_name, last_name, username, id } = userInput.from;
        const userId = id;

        // Проверяем существует ли файл JSON и читаем его содержимое
        let usersBase = [];
        const usersBaseFilePath = "usersBase.json";

        if (fs.existsSync(usersBaseFilePath)) {
            const usersBaseData = fs.readFileSync(usersBaseFilePath, 'utf8');

            // Проверяем, не пуст ли файл JSON
            if (usersBaseData.length > 0) {
                usersBase = JSON.parse(usersBaseData);
            }
        }

        // Проверяем, есть ли уже пользователь с таким userId
        const existingUserIndex = usersBase.findIndex((user) => user.userId === userId);
        if (existingUserIndex !== -1) {
            // Проверяем, есть ли изменения в данных пользователя
            const existingUser = usersBase[existingUserIndex];
            const updatedUser = {
                username: username || first_name || last_name || "Unknown",
                userId,
                language: languageCode
            };

            // Если есть изменения, обновляем данные пользователя в базе данных
            if (
                existingUser.username !== updatedUser.username ||
                existingUser.language !== updatedUser.language
            ) {
                usersBase[existingUserIndex] = updatedUser;

                // Записываем обновленные данные в файл JSON
                fs.writeFileSync(usersBaseFilePath, JSON.stringify(usersBase, null, 2));
                console.log("Данные пользователя успешно обновлены в базе данных.");
            } else {
                console.log("Нет изменений в данных пользователя.");
            }
        } else {
            // Добавление нового пользователя в массив
            usersBase.push({
                username: username || first_name || last_name || "Unknown",
                userId,
                language: languageCode
            });

            // Запись обновленных данных в файл JSON
            fs.writeFileSync(usersBaseFilePath, JSON.stringify(usersBase, null, 2));
            console.log("Пользователь успешно добавлен в базу данных.");
        }
    } catch (error) {
        console.error("Произошла ошибка при сохранении пользователя:", error);
    }
}
  // sendKeyboard(userInput){
    // const keyboard = [
  //     [{ text: 'Button 1', callback_data: 'button1' },{ text: 'Button 2', callback_data: 'button2' }]
  // ];
  //   const chatId = userInput.chat.id;

  //       // Отправка сообщения с клавиатурой
  //       bot.sendMessage(chatId, 'Выберите действие:', {
  //           reply_markup: {
  //               keyboard: keyboard,
  //               resize_keyboard: true,  // Можете убрать, если не требуется
  //               one_time_keyboard: true  // Можете убрать, если не требуется
  //           }
  //       })
  //       .then(() => {
  //           console.log('Клавиатура успешно отправлена.');
  //       })
  //       .catch((error) => {
  //           console.error('Ошибка при отправке клавиатуры:', error);
  //       });
  //   } //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  kantorMenu(language) {
    const questionsData = fs.readFileSync("questions.json");
    const questions = JSON.parse(questionsData);
    const kursText = "💱 "+questions[language].options[0];
    const contactText = "📨 "+questions[language].options[1];
    const actualText = "📈 "+questions[language].options[2];
    const startOverText = "ℹ️ "+questions[language].options[3];
    const addresses = "📍 "+ questions[language].options[4];

    return {
      keyboard: [
        [
          { text: kursText},
          { text: contactText},
        ],
        [
          { text: actualText},
          { text: startOverText},
        ],
        [{ text:addresses}],
      ],
      resize_keyboard: true,  // Можете убрать, если не требуется
      one_time_keyboard: true
    };
  }
  sendAddressMenu(userLanguage) {
    const questionsData = fs.readFileSync("questions.json");
    const questions = JSON.parse(questionsData);

    const citiesData = questions.citiesLanguage;
    const cities = citiesData.flatMap((cityObj) => cityObj[userLanguage]);
    const buttons = cities.map((city) => ({
      text: city,
      callback_data: city + "ADD", // или можно указать другие данные обратного вызова, если это необходимо
    }));
    // Разбиваем кнопки на массивы, каждый из которых содержит не более трех кнопок
    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 3) {
      inlineKeyboard.push(buttons.slice(i, i + 3));
    }
    return { inline_keyboard: inlineKeyboard };
  }
  sendAddressMSG(action, userId) {
    switch (action) {
      case "KrakowADD":
      case "КраковADD":
      case "KrakówADD":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Kraków</b>\n \n<b>email</b> 📬: kantor1913.krakow1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.+D%C5%82uga+16,+31-146+Krak%C3%B3w'>ul. Długa 16, 31-146 Kraków</a>\n🕘 9:00-20:00",
          {
            parse_mode: "HTML",
          }
        );
        break;

      case "WrocławADD":
      case "ВроцлавADD":
      case "WroclawADD":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Wrocław</b>\n \n<b>email</b> 📬: kantor1913.wroclaw1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=O%C5%82awska+24,+50-123+Wroc%C5%82aw/'>ul. Oławska 24, 50-123 Wrocław</a>\n🕘 9:00-21:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "PrzemyslADD":
      case "PrzemyślADD":
      case "ПшемысльADD":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Przemyśl</b>\n \n<b>email</b> 📬: kantor1913.krakow1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=Plac+Na+Bramie+5,+37-700+Przemyśl/'>ul. Plac na bramie 5, 37-700 Przemyśl</a>\n🕘 8:00-18:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "GdanskADD":
      case "GdańskADD":
      case "ГданьскADD":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Gdańsk</b>\n \n<b>email</b> 📬: kantor1913.gdansk1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=Podwale+Staromiejskie+94,+80-844+Gdańsk/'>ul. Podwale Staromiejskie 94/95, 80-844 Gdańsk</a>\n🕘 9:00-21:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "LodzADD":
      case "ŁódźADD":
      case "ЛодзьADD":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Łódź</b>\n \n<b>email</b> 📬: kantor1913.lodz1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.Piotrkowska+97+L.+UZ+3,+90-425+Lódź/'>ul.Piotrkowska 97 L. UZ 3, 90-425 Lódź</a>\n🕘 9:00-21:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "WarszawaADD":
      case "ВаршаваADD":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Warszawa</b>\n \n<b>email</b> 📬: kantor1913.warszawa1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=al.+Jerozolimskie+42,+00-042+Warszawa/'>Aleje Jerozolimskie 42, 00-042 Warszawa</a>\n🕘 9:00-21:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "KrakowPKPADD":
      case "Kraków PKPADD":
      case "Краков ПКПADD":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Kraków (PKP)</b>\n \n<b>email</b> 📬: kantor1913.krakow2@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.Pawia+5A,+31-154+Kraków/'>ul.Pawia 5a (Lokal 23), 31-154 Kraków</a>\n🕘 9:00-21:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "RzeszowADD":
      case "RzeszówADD":
      case "ЖешувADD":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Rzeszów</b>\n \n<b>email</b> 📬: kantor1913.krakow1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.+D%C5%82uga+16,+31-146+Krak%C3%B3w'>ul. Długa 16, 31-146 Kraków</a>\n🕘 9:00-20:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "PoznanADD":
      case "PoznańADD":
      case "ПознаньADD":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Kraków</b>\n \n<b>email</b> 📬: kantor1913.krakow1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.+D%C5%82uga+16,+31-146+Krak%C3%B3w'>ul. Długa 16, 31-146 Kraków</a>\n🕘 9:00-20:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "LublinADD":
      case "ЛюблинADD":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Kraków</b>\n \n<b>email</b> 📬: kantor1913.krakow1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.+D%C5%82uga+16,+31-146+Krak%C3%B3w'>ul. Długa 16, 31-146 Kraków</a>\n🕘 9:00-20:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "SzczecinADD":
      case "ЩецинADD":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Kraków</b>\n \n<b>email</b> 📬: kantor1913.krakow1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.+D%C5%82uga+16,+31-146+Krak%C3%B3w'>ul. Długa 16, 31-146 Kraków</a>\n🕘 9:00-20:00",
          {
            parse_mode: "HTML",
          }
        );
        break;

      default:
        break;
    }
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
    switch (action) {
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
    return { keyboard: inlineKeyboard };
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
  actualMultitul(language) {
    return this.firstNewsPaper(language);
  }
  firstNewsPaper(language) {
    const paymentInfo = {
      ru: "<b>Оплата картой</b> 💳\nУважаемые клиенты, с радостью сообщаем вам, что теперь вы можете обменивать свои деньги с помощью банковской карты.\nЭта транзакция будет включать минимальную плату:\nПольская карта - 1,0% от курса продажи\nИностранная карта - 3,0% от курса продажи\n(Лимит единиц транзакций 1000)",
      en: "<b>Card Payment</b> 💳\nDear Customers, we are pleased to inform you that you can now exchange your money using a debit/credit card.\nThis transaction will incur a minimum fee:\nPolish card - 1.0% to the selling rate\nForeign card - 3.0% to the selling rate\n(Transaction units limit 1000)",
      pl: "<b>Płatność kartą</b> 💳\nSzanowni Klienci, z przyjemnością informujemy, że od teraz możesz wymieniać swoje pieniądze za pomocą karty płatniczej.\nTa transakcja będzie podlegać minimalnej opłacie:\nKarta polska - 1,0% do kursu sprzedaży\nKarta zagraniczna - 3,0% do kursu sprzedaży\n(Limit jednostek transakcji 1000)",
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
