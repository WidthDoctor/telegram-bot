// npm run dev
const token = "7122702562:AAFcNto8K7YTBf3NOQhB51q5LRYImjZXLlM";
const fs = require("fs");
const telegramApi = require("node-telegram-bot-api");
const bot = new telegramApi(token, { polling: true });
const cheerio = require("cheerio");
const questions = require("./questions.json");

let FLAGKURS = false;
let FLAGCONTACTS = false;
let FLAGADDRESS = false;
let language = "";
class NewBot {
  constructor() {
    this.usersBaseFilePath = "usersBase.json";
    bot.setMyCommands([
      { command: "/start", description: "Menu" },
      { command: "/contact", description: "Contacts" },
      { command: "/language", description: "Change language"},
    ]);
  }

  async currentCource(city, userId) {
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

      this.sendCurrentRate(currencyRates, userId, city);
    } catch (error) {
      console.error("Произошла ошибка:", error);
    }
  } //курс
  commands() {
    bot.on("message", (userInput) => {
      const usersBaseData = fs.readFileSync("usersBase.json");
      const text = userInput.text;
      // const chatId = userInput.from.id;
      const userId = userInput.from.id;
      const usersBase = JSON.parse(usersBaseData);
      const user = usersBase.find((user) => user.userId === userId);

      switch (text) {
        case '/language':
          this.setLanguageMenu(userInput);
        break;
        case "/start":
          if (!user) {
            console.log("Пользователь не найден в базе данных");
            this.setLanguageMenu(userInput);
            //чекаем есть ли юзер в базе данных
          }
          else
          if(user){
            console.log('а тут нахуя работает?');
            FLAGKURS = false;
            FLAGCONTACTS = false;
            this.gotoPrivateChat(userInput);
          }
          break;
        default:
          this.KONTROL_PANEL_LANGUAGE(userInput, text);
          this.KONTROL_PANEL_SECONDMENU(userInput); //контролка на языки
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
  KONTROL_PANEL_LANGUAGE(userInput, text) {
    console.log(text);
    const userId = userInput.from.id;
    const ALL_citiesJSON = questions.citiesLanguage;
    const citiesKeys = ALL_citiesJSON.flatMap((cityObj) =>
      Object.values(cityObj)
    );
    const usersBaseData = fs.readFileSync("usersBase.json");
      const usersBase = JSON.parse(usersBaseData);
      const user = usersBase.find((user) => user.userId === userId);
      // const userLanguage = user.language;
    switch (text) {
      case "🇷🇺 Русский":
        this.saveUser(userInput, "ru");
        this.gotoPrivateChat(userInput);
        break;
      case "🇺🇸 English":
        console.log("Выбран язык 🇺🇸 " + text);
        this.saveUser(userInput, "en");
        this.gotoPrivateChat(userInput);
        break;
      case "🇵🇱 Polska":
        console.log("Выбран язык 🇵🇱 " + text);
        this.saveUser(userInput, "pl");
        this.gotoPrivateChat(userInput);
        break;

      default:

        break;
    }
  }
  KONTROL_PANEL_SECONDMENU(userInput){
    const usersBaseData = fs.readFileSync("usersBase.json");
    const text = userInput.text;
    const usersBase = JSON.parse(usersBaseData);
    const userId = userInput.from.id;
    const ALL_citiesJSON = questions.citiesLanguage;
    const citiesKeys = ALL_citiesJSON.flatMap((cityObj) =>
      Object.values(cityObj)
    );
    const user = usersBase.find((user) => user.userId === userId);
    const language = user.language;
    switch (text) {
      case text.match(/💱/i) ? text : null:
        FLAGKURS = true;
        FLAGADDRESS =false;
        FLAGCONTACTS = false;
        this.selectCity(language, userInput);
        console.log("да это ебать курс валют");
        break;
        case '/contact':
      case text.match(/📨/i) ? text : null:
        FLAGKURS = false;
        FLAGADDRESS =false;
        FLAGCONTACTS = true;
        this.selectCityForContact(language, userInput);
        console.log("да это ебать контакты");
        break;
        case text.match(/📍/i)?text:null:
          FLAGKURS=false;
          FLAGCONTACTS=false;
          FLAGADDRESS =true;
          this.sendAddressMenu(language,userInput)
        break;
        case text.match(/ℹ️/i)?text:null:
          console.log('о нас отработало');
          FLAGKURS=false;
          FLAGCONTACTS=false;
          FLAGADDRESS = false;
          this.sendAboutInfo(language,userInput);
        break;
        case text.match(/📈/i)?text:null:
          console.log('actual отработало');
          FLAGKURS=false;
          FLAGCONTACTS=false;
          FLAGADDRESS = false;
          this.actualMultitul(language,userInput);
        break;
      default:
        if (citiesKeys.includes(text) && FLAGKURS === true) {
          this.currentCource(text, userId);
          console.log("сработал курс валют");
        }
        if (citiesKeys.includes(text) && FLAGCONTACTS === true) {
          this.sendContactsForUser(text, userId);
          console.log("сработал отправка контакта");
        }
        if (citiesKeys.includes(text) && FLAGADDRESS === true) {
          this.sendAddressMSG(text,userId);
          console.log("сработал отправка адреса");
        }
        //тут надо добавить на инфо шляпу
        break;
    }
  }
  setLanguageMenu(userInput) {
    const keyboard = [
      [{ text: "🇺🇸 English" }, { text: "🇵🇱 Polska" }, { text: "🇷🇺 Русский" }],
    ];
    const chatId = userInput.chat.id;

    // Отправка сообщения с клавиатурой
    bot
      .sendMessage(chatId, "Choose a language:", {
        reply_markup: {
          keyboard: keyboard,
          resize_keyboard: true, // Можете убрать, если не требуется
          one_time_keyboard: true, // Можете убрать, если не требуется
        },
      })
      .then(() => {
        console.log("Клавиатура успешно отправлена.");
      })
      .catch((error) => {
        console.error("Ошибка при отправке клавиатуры:", error);
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
    try {
      const { first_name, last_name, username, id } = userInput.from;
      const userId = id;

      // Проверяем существует ли файл JSON и читаем его содержимое
      let usersBase = [];
      const usersBaseFilePath = "usersBase.json";

      if (fs.existsSync(usersBaseFilePath)) {
        const usersBaseData = fs.readFileSync(usersBaseFilePath, "utf8");

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
          language: languageCode,
        };

        // Если есть изменения, обновляем данные пользователя в базе данных
        if (
          existingUser.username !== updatedUser.username ||
          existingUser.language !== updatedUser.language
        ) {
          usersBase[existingUserIndex] = updatedUser;

          // Записываем обновленные данные в файл JSON
          fs.writeFileSync(
            usersBaseFilePath,
            JSON.stringify(usersBase, null, 2)
          );
          console.log("Данные пользователя успешно обновлены в базе данных.");
        } else {
          console.log("Нет изменений в данных пользователя.");
        }
      } else {
        // Добавление нового пользователя в массив
        usersBase.push({
          username: username || first_name || last_name || "Unknown",
          userId,
          language: languageCode,
        });

        // Запись обновленных данных в файл JSON
        fs.writeFileSync(usersBaseFilePath, JSON.stringify(usersBase, null, 2));
        console.log("Пользователь успешно добавлен в базу данных.");
      }
    } catch (error) {
      console.error("Произошла ошибка при сохранении пользователя:", error);
    }
  }
  kantorMenu(language) {
    const questionsData = fs.readFileSync("questions.json");
    const questions = JSON.parse(questionsData);
    const kursText = "💱 " + questions[language].options[0];
    const contactText = "📨 " + questions[language].options[1];
    const actualText = "📈 " + questions[language].options[2];
    const startOverText = "ℹ️ " + questions[language].options[3];
    const addresses = "📍 " + questions[language].options[4];

    return {
      keyboard: [
        [{ text: kursText }, { text: contactText }],
        [{ text: actualText }, { text: startOverText }],
        [{ text: addresses }],
      ],
      resize_keyboard: true, // Можете убрать, если не требуется
      one_time_keyboard: true,
    };
  }

  sendAddressMSG(text, userId) {
    switch (text) {
      case "Krakow":
      case "Краков":
      case "Kraków":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Kraków</b>\n \n<b>email</b> 📬: kantor1913.krakow1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.+D%C5%82uga+16,+31-146+Krak%C3%B3w'>ul. Długa 16, 31-146 Kraków</a>\n🕘 9:00-20:00",
          {
            parse_mode: "HTML",
          }
        );
        break;

      case "Wrocław":
      case "Вроцлав":
      case "Wroclaw":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Wrocław</b>\n \n<b>email</b> 📬: kantor1913.wroclaw1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=O%C5%82awska+24,+50-123+Wroc%C5%82aw/'>ul. Oławska 24, 50-123 Wrocław</a>\n🕘 9:00-21:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "Przemysl":
      case "Przemyśl":
      case "Пшемысль":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Przemyśl</b>\n \n<b>email</b> 📬: kantor1913.krakow1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=Plac+Na+Bramie+5,+37-700+Przemyśl/'>ul. Plac na bramie 5, 37-700 Przemyśl</a>\n🕘 8:00-18:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "Gdansk":
      case "Gdańsk":
      case "Гданьск":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Gdańsk</b>\n \n<b>email</b> 📬: kantor1913.gdansk1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=Podwale+Staromiejskie+94,+80-844+Gdańsk/'>ul. Podwale Staromiejskie 94/95, 80-844 Gdańsk</a>\n🕘 9:00-21:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "Lodz":
      case "Łódź":
      case "Лодзь":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Łódź</b>\n \n<b>email</b> 📬: kantor1913.lodz1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.Piotrkowska+97+L.+UZ+3,+90-425+Lódź/'>ul.Piotrkowska 97 L. UZ 3, 90-425 Lódź</a>\n🕘 9:00-21:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "Warszawa":
      case "Варшава":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Warszawa</b>\n \n<b>email</b> 📬: kantor1913.warszawa1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=al.+Jerozolimskie+42,+00-042+Warszawa/'>Aleje Jerozolimskie 42, 00-042 Warszawa</a>\n🕘 9:00-21:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "KrakowPKP":
      case "Kraków PKP":
      case "Краков ПКП":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Kraków (PKP)</b>\n \n<b>email</b> 📬: kantor1913.krakow2@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.Pawia+5A,+31-154+Kraków/'>ul.Pawia 5a (Lokal 23), 31-154 Kraków</a>\n🕘 9:00-21:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "Rzeszow":
      case "Rzeszów":
      case "Жешув":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Rzeszów</b>\n \n<b>email</b> 📬: kantor1913.krakow1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.+D%C5%82uga+16,+31-146+Krak%C3%B3w'>ul. Długa 16, 31-146 Kraków</a>\n🕘 9:00-20:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "Poznan":
      case "Poznań":
      case "Познань":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Kraków</b>\n \n<b>email</b> 📬: kantor1913.krakow1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.+D%C5%82uga+16,+31-146+Krak%C3%B3w'>ul. Długa 16, 31-146 Kraków</a>\n🕘 9:00-20:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "Lublin":
      case "Люблин":
        bot.sendMessage(
          userId,
          "<b>Kantor 1913 Kraków</b>\n \n<b>email</b> 📬: kantor1913.krakow1@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.+D%C5%82uga+16,+31-146+Krak%C3%B3w'>ul. Długa 16, 31-146 Kraków</a>\n🕘 9:00-20:00",
          {
            parse_mode: "HTML",
          }
        );
        break;
      case "Szczecin":
      case "Щецин":
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
  sendCurrentRate(rate, userId, text) {
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
      return [{ text: buttonLabel, callback_data: "kek" }];
    });

    // Отправляем сообщение с кнопками пользователю
    const actualCurseMsg = {
      ru: "Актуальный курс на данный момент:",
      en: "Current exchange rate at the moment:",
      pl: "Aktualny kurs na chwilę obecną:",
    };
    this.sendContactsForUser(text, userId);
    bot.sendMessage(userId, actualCurseMsg[language], {
      reply_markup: JSON.stringify({ inline_keyboard: buttons }),
    });

    return JSON.stringify({ inline_keyboard: buttons });
  }
  sendContactsForUser(text, userId) {
    const usersBaseData = fs.readFileSync("usersBase.json");
    const usersBase = JSON.parse(usersBaseData);
    const user = usersBase.find((user) => user.userId === userId);
    const language = user.language;
    let phoneNumber, contactName;
    switch (text) {
      case "Krakow":
      case "Краков":
      case "Kraków":
        phoneNumber = "+48500560146"; // Номер телефона для отправки сообщения
        contactName = "kontact ";
        break;

      case "Wrocław":
      case "Вроцлав":
      case "Wroclaw":
        phoneNumber = "+48500560146";
        contactName = "kontact ";
        break;
      case "Przemysl":
      case "Przemyśl":
      case "Пшемысль":
        phoneNumber = "+48500560146";
        contactName = "kontact ";
        break;
      case "Gdansk":
      case "Gdańsk":
      case "Гданьск":
        phoneNumber = "+48500560146";
        contactName = "kontact ";
        break;
      case "Lodz":
      case "Łódź":
      case "Лодзь":
        phoneNumber = "+48500560146";
        contactName = "kontact ";
        break;
      case "Warszawa":
      case "Варшава":
        phoneNumber = "+48500560146";
        contactName = "kontact ";
        break;
      case "KrakowPKP":
      case "Kraków PKP":
      case "Краков ПКП":
        phoneNumber = "+48500560146";
        contactName = "kontact ";
        break;
      case "Rzeszow":
      case "Rzeszów":
      case "Жешув":
        phoneNumber = "+48500560146";
        contactName = "kontact ";
        break;
      case "Poznan":
      case "Poznań":
      case "Познань":
        phoneNumber = "+48500560146";
        contactName = "kontact ";
        break;
      case "Lublin":
      case "Люблин":
        phoneNumber = "+48500560146";
        contactName = "kontact ";
        break;
      case "Szczecin":
      case "Щецин":
        phoneNumber = "+48500560146";
        contactName = "kontact ";
        break;

      default:
        break;
    }
    const chatUrl = `https://t.me/${phoneNumber}`;

    const keyboard = {
      inline_keyboard: [[{ text: contactName, url: chatUrl }]],
      resize_keyboard: true, // Разрешить кнопкам изменять размер для соответствия экрану
    };
    const managerText = {
      en: "Contact the manager",
      ru: "Связь с менеджером",
      pl: "Kontakt z menedżerem",
    };
    bot.sendMessage(userId, managerText[language], {
      reply_markup: JSON.stringify(keyboard),
      resize_keyboard: true,
    });
  }
  selectCity(userLanguage, userInput) {
    console.log(userLanguage);
    const chatId = userInput.chat.id;
    const questionsData = fs.readFileSync("questions.json");
    const questions = JSON.parse(questionsData);
    const messageCity = questions[userLanguage].city;
    const citiesData = questions.citiesLanguage;
    const cities = citiesData.flatMap((cityObj) => cityObj[userLanguage]);
    const buttons = cities.map((city) => ({
      text: city,
    }));
    // Разбиваем кнопки на массивы, каждый из которых содержит не более трех кнопок
    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 3) {
      inlineKeyboard.push(buttons.slice(i, i + 3));
    }
    bot.sendMessage(chatId, messageCity, {
      reply_markup: {
        keyboard: inlineKeyboard,
        resize_keyboard: true, // Можете убрать, если не требуется
        one_time_keyboard: true,
      },
    });
  }
  selectCityForContact(userLanguage, userInput) {
    const chatId = userInput.chat.id;
    const questionsData = fs.readFileSync("questions.json");
    const questions = JSON.parse(questionsData);
    const messageCityContact = questions[userLanguage].contactQuestion;
    const citiesData = questions.citiesLanguage;
    const cities = citiesData.flatMap((cityObj) => cityObj[userLanguage]);
    const buttons = cities.map((city) => ({
      text: city,
    }));
    // Разбиваем кнопки на массивы, каждый из которых содержит не более трех кнопок
    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 3) {
      inlineKeyboard.push(buttons.slice(i, i + 3));
    }
    bot.sendMessage(chatId, messageCityContact, {
      reply_markup: {
        keyboard: inlineKeyboard,
        resize_keyboard: true, // Можете убрать, если не требуется
        one_time_keyboard: true,
      },
    });
  }
  sendAddressMenu(userLanguage, userInput) {
    const chatId = userInput.chat.id;
    const questionsData = fs.readFileSync("questions.json");
    const questions = JSON.parse(questionsData);
    const messageCity = questions[userLanguage].city;
    const citiesData = questions.citiesLanguage;
    const cities = citiesData.flatMap((cityObj) => cityObj[userLanguage]);
    const buttons = cities.map((city) => ({
      text: city,
    }));
    // Разбиваем кнопки на массивы, каждый из которых содержит не более трех кнопок
    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 3) {
      inlineKeyboard.push(buttons.slice(i, i + 3));
    }
    bot.sendMessage(chatId, messageCity, {
      reply_markup: {
        keyboard: inlineKeyboard,
        resize_keyboard: true, // Можете убрать, если не требуется
        one_time_keyboard: true,
      },
    });
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
  sendAboutInfo(language,userInput) {
    const chatId = userInput.chat.id;
    const questionsData = fs.readFileSync("questions.json");
    const questions = JSON.parse(questionsData);
    const AboutMSG = questions.aboutUs[language];
    bot.sendMessage(chatId, AboutMSG)
  }
  actualMultitul(language,userInput) {
    const chatId = userInput.chat.id;
    const actualMSG = this.firstNewsPaper(language);
    bot.sendMessage(chatId,actualMSG,{ parse_mode: 'HTML' })
  }
  firstNewsPaper(language) {
    const paymentInfo = {
      ru: "<b>Оплата картой</b> 💳\nУважаемые клиенты, с радостью сообщаем вам, что теперь вы можете обменивать свои деньги с помощью банковской карты.\nЭта транзакция будет включать минимальную плату:\nПольская карта - 1,0% от курса продажи\nИностранная карта - 3,0% от курса продажи\n(Лимит единиц транзакций 1000)",
      en: "<b>Card Payment</b> 💳\nDear Customers, we are pleased to inform you that you can now exchange your money using a debit/credit card.\nThis transaction will incur a minimum fee:\nPolish card - 1.0% to the selling rate\nForeign card - 3.0% to the selling rate\n(Transaction units limit 1000)",
      pl: "<b>Płatność kartą</b> 💳\nSzanowni Klienci, z przyjemnością informujemy, że od teraz możesz wymieniać swoje pieniądze za pomocą karty płatniczej.\nTa transakcja będzie podlegać minimalnej opłacie:\nKarta polska - 1,0% do kursu sprzedaży\nKarta zagraniczna - 3,0% do kursu sprzedaży\n(Limit jednostek transakcji 1000)",
    };
    return paymentInfo[language];
  }
}

const myBot = new NewBot(); // Создаем экземпляр класса
myBot.commands();
// myBot.cerrentCource();
