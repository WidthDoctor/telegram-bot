// npm run dev
//7525570494:AAHa7O4Riwznvo1wBQPDaFkFQbQ2bGfVQ3w
// 7335216321:AAHsftZsYkU12cvz6IjKUIX1z6MK3SY40ww тестовый
// 7525570494:AAHa7O4Riwznvo1wBQPDaFkFQbQ2bGfVQ3w продакшен
const dotenv = require("dotenv").config();
const token = process.env.API_TOKEN;
const fs = require("fs");
const telegramApi = require("node-telegram-bot-api");
const bot = new telegramApi(token, { polling: true });
const cheerio = require("cheerio");
const questions = require("./questions.json");
const { url } = require("inspector");

let FLAGKURS = false;
let FLAGCONTACTS = false;
let FLAGADDRESS = false;
let language = "";
let kursToCalculate;

class NewBot {
  constructor() {
    this.usersBaseFilePath = "usersBase.json";
    bot.setMyCommands([
      { command: "/start", description: "Menu" },
      { command: "/language", description: "Change language" },
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
      console.log(currencyRates);
      this.sendCurrentRate(currencyRates, userId, city);
      kursToCalculate = currencyRates;
    } catch (error) {
      console.error("Произошла ошибка:", error);
    }
  } //курс
  commands() {
    bot.on('polling_error', (error) => {
      console.log('Polling error:', error);
    });
    bot.on("message", (msg) => {
      console.log(msg);

      const usersBaseData = fs.readFileSync("usersBase.json");
      const text = msg.text;
      // const chatId = userInput.from.id;
      const usersBase = JSON.parse(usersBaseData);
      const userId = msg.from.id;
      const user = usersBase.find((user) => user.userId === userId);

      if (msg.web_app_data) {
        const data = JSON.parse(msg.web_app_data.data);
        const summa = data.sum;
        const userId = msg.from.id;
        this.calculateSum(summa, userId);
      }
      if(msg.contact){
        const contact = msg.contact
        const language = user.language;
        this.orderBotButton(msg,contact,language)
      }
    });
    bot.on("message", (userInput) => {
      console.log(userInput);
      const usersBaseData = fs.readFileSync("usersBase.json");
      const text = userInput.text;
      // const chatId = userInput.from.id;
      const userId = userInput.from.id;
      const usersBase = JSON.parse(usersBaseData);
      const user = usersBase.find((user) => user.userId === userId);

      switch (text) {
        case "/language":
          this.setLanguageMenu(userInput);
          break;
        case "/start":
          if (!user) {
            this.setLanguageMenu(userInput);
            //чекаем есть ли юзер в базе данных
          } else if (user) {
            console.log(user.username);
            FLAGKURS = false;
            FLAGCONTACTS = false;
            this.gotoPrivateChat(userInput);
          }
          break;
        default:
          this.KONTROL_PANEL_LANGUAGE(userInput, text);
          this.KONTROL_PANEL_MULTITUL(userInput); //контролка на языки
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
      case "🏳️ Русский":
        this.saveUser(userInput, "ru");
        this.gotoPrivateChat(userInput);
        break;
      case "🇺🇸 English":
        this.saveUser(userInput, "en");
        this.gotoPrivateChat(userInput);
        break;
      case "🇵🇱 Polski":
        this.saveUser(userInput, "pl");
        this.gotoPrivateChat(userInput);
        break;
      case "🇺🇦 Українська":
        this.saveUser(userInput, "ukr");
        this.gotoPrivateChat(userInput);
        break;

      default:
        break;
    }
  }
  KONTROL_PANEL_MULTITUL(userInput) {
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
        FLAGADDRESS = false;
        FLAGCONTACTS = false;
        this.selectCity(language, userInput);
        break;
      case text.match(/📨/i) ? text : null:
        FLAGKURS = false;
        FLAGADDRESS = false;
        FLAGCONTACTS = true;
        this.selectCityForContact(language, userInput);
        break;
      case text.match(/📍/i) ? text : null:
        FLAGKURS = false;
        FLAGCONTACTS = false;
        FLAGADDRESS = true;
        this.sendAddressMenu(language, userInput);
        break;
      case text.match(/🌐/i) ? text : null:
        FLAGKURS = false;
        FLAGCONTACTS = false;
        FLAGADDRESS = false;
        this.sendAboutInfo(language, userInput);
        break;
      case text.match(/📈/i) ? text : null:
        FLAGKURS = false;
        FLAGCONTACTS = false;
        FLAGADDRESS = false;
        this.actualMultitul(language, userInput);
        break;
      case text.match(/🛠️/i) ? text : null:
        this.sendFeaturesMenu(language, userInput);
        break;
      case text.match(/↩️/i) ? text : null:
        this.sendGeneralMenu(userInput, language);
        break;
      case text.match(/📝/i) ? text : null:
        this.orderBotButton(userInput, language);
        break;
      default:
        if (citiesKeys.includes(text) && FLAGKURS === true) {
          this.currentCource(text, userId);
        }
        if (citiesKeys.includes(text) && FLAGCONTACTS === true) {
          this.sendContactsForUser(text, userId);
        }
        if (citiesKeys.includes(text) && FLAGADDRESS === true) {
          this.sendAddressMSG(text, userId, language);
        }
        //тут надо добавить на инфо шляпу
        break;
    }
  }
  setLanguageMenu(userInput) {
    const keyboard = [
      [{ text: "🇺🇦 Українська" }],
      [{ text: "🇺🇸 English" }, { text: "🇵🇱 Polski" }, { text: "🏳️ Русский" }],
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
  orderBotButton(userInput, contact, language) {
    console.log(userInput);

    const chatId = userInput.chat.id;
    const cliptechChat = 299219486; // Chat ID менеджера
    const text = {
      en: "<b>Great!</b>\n\nI’m passing your contact to our manager. Please, wait — someone will contact you shortly.",
      ru: "<b>Отлично!</b>\n\nПередаю Ваш контакт нашему менеджеру. Пожалуйста, ожидайте — с Вами свяжутся в ближайшее время.",
      pl: "<b>Świetnie!</b>\n\nPrzekazuję Państwa kontakt do naszego menedżera. Proszę, poczekajcie — ktoś skontaktuje się z Państwem wkrótce.",
      ukr: "<b>Чудово!</b>\n\nПередаю ваш контакт нашому менеджеру. Будь ласка, чекайте — з вами зв’яжуться найближчим часом.",
  };


    let textToDenis = "Новый заказ!";

    // Отправляем сообщение пользователю
    bot.sendMessage(chatId, text[language], {
        reply_markup: this.generalMenu(language),
        resize_keyboard: true,
        parse_mode: "HTML",
    });

    // Отправляем контакт менеджеру
    setTimeout(() => {
        bot.sendContact(cliptechChat, contact.phone_number, contact.first_name, {
            last_name: contact.last_name, // Если есть фамилия
        })
        .then(() => {
            // Уведомляем менеджера о новом заказе без кнопки
            bot.sendMessage(cliptechChat, textToDenis);
        })
        .catch((err) => {
            console.log('Ошибка при отправке контакта:', err);
            // Если произошла ошибка при отправке контакта, уведомляем о ней
            bot.sendMessage(chatId, 'Произошла ошибка при отправке вашего контакта. Попробуйте снова.');
        });
    }, 1000);
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
        this.setLanguageMenu(userInput);
      }

      const userLanguage = user.language;
      const questionsData = fs.readFileSync("questions.json");
      const questions = JSON.parse(questionsData);

      const startMessage = questions[userLanguage].start;
      const startMessageInBot = questions[userLanguage].startIn;
      if (userId === chatId) {
        await bot.sendMessage(userId, startMessageInBot, {
          reply_markup: this.generalMenu(userLanguage),
        });
      }
      if (userId !== chatId) {
        await bot.sendMessage(userId, startMessage, {
          // reply_markup: this.featuresMenu(userLanguage),
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
  generalMenu(language) {
    const questionsData = fs.readFileSync("questions.json");
    const questions = JSON.parse(questionsData);
    const featuresButton = "🛠️ " + questions[language].featuresText[0];
    const ourResourcesText = "🌐 " + questions[language].options[3];
    const orderBotButton = "📝 " + questions[language].orderButton[0];
    //
    return {
      keyboard: [
        [{ text: featuresButton }, { text: ourResourcesText }],
        [{ text: orderBotButton ,request_contact: true}],
      ],
      resize_keyboard: true, // Можете убрать, если не требуется
      one_time_keyboard: true,
    };
  }
  featuresMenu(language) {
    const questionsData = fs.readFileSync("questions.json");
    const questions = JSON.parse(questionsData);
    const kursText = "💱 " + questions[language].options[0];
    const contactText = "📨 " + questions[language].options[1];
    const actualText = "📈 " + questions[language].options[2];
    const addresses = "📍 " + questions[language].options[4];
    const calculator = "🧮 " + questions[language].options[5];
    const page = "📰 " + questions[language].options[6];
    const back = "↩️ " + questions[language].options[7];
    return {
      keyboard: [
        [{ text: kursText }, { text: contactText }],
        [{ text: actualText }, { text: addresses }],
        [
          {
            text: calculator,
            web_app: {
              url: "https://widthdoctor.github.io/calculator_currency/calculator",
              request_write_access: true,
              // https://tiana.by/
              // https://widthdoctor.github.io/calculator_currency/calculator
            },
          },
          {
            text: page,
            web_app: {
              url: "https://www.gazeta.pl/0,0.html",
              request_write_access: true,
              // https://tiana.by/
              // https://widthdoctor.github.io/calculator_currency/calculator
            },
          },
        ],
        [{ text: back }],
      ],
      resize_keyboard: true, // Можете убрать, если не требуется
      one_time_keyboard: true,
    };
  }
  sendFeaturesMenu(language, userInput) {
    const chatId = userInput.chat.id;
    let text = {
      en: "<b>In this menu, you can explore the bot's features and learn how they work.</b>\n\nAll pricing elements are collected here to help you choose the functions that are best suited for your business. Feel free to click on anything — everything is available for exploration!\n\n<b>To order the bot</b>\nsimply go to the main menu in the 'Our Resources' section (Instagram / Facebook) or contact us via the 'Order Bot' button.",
      ru: "<b>В этом меню ты можешь ознакомиться с функциями бота и узнать, как они работают.</b>\n\nЗдесь собраны все элементы ценника, чтобы ты мог выбрать именно те функции, которые подойдут для твоего бизнеса. Не стесняйся нажимать на любые элементы — все доступно для исследования!\n\n<b>Чтобы заказать бота</b>\nпросто перейди в главное меню в раздел 'Наши ресурсы' (Instagram / Facebook) или свяжись с нами через кнопку 'Заказать бота'.",
      pl: "<b>W tym menu możesz zapoznać się z funkcjami bota i dowiedzieć się, jak działają.</b>\n\nWszystkie elementy cenowe są tutaj zebrane, aby pomóc Ci wybrać funkcje, które najlepiej pasują do Twojego biznesu. Śmiało klikaj na wszystko — wszystko jest dostępne do eksploracji!\n\n<b>Aby zamówić bota</b>\npo prostu przejdź do głównego menu w sekcji 'Nasze zasoby' (Instagram / Facebook) lub skontaktuj się z nami za pomocą przycisku 'Zamów bota'.",
      ukr: "<b>У цьому меню ти можеш ознайомитись з функціями бота та дізнатися, як вони працюють.</b>\n\nТут зібрані всі елементи цінника, щоб ти міг вибрати саме ті функції, які підходять для твого бізнесу. Не соромся натискати на будь-які елементи — все доступно для дослідження!\n\n<b>Щоб замовити бота</b>\nпросто перейдіть до головного меню в розділ 'Наші ресурси' (Instagram / Facebook) або зв'яжіться з нами через кнопку 'Замовити бота'.",
    };
    bot.sendMessage(chatId, text[language], {
      reply_markup: this.featuresMenu(language),
      resize_keyboard: true,
      parse_mode: "HTML",
    });
  }
  sendAddressMSG(text, userId, language) {
    switch (text) {
      case "Krakow":
      case "Краков":
      case "Kraków":
      case "Краків":
        bot.sendMessage(
          userId,
          "<b>Adres twojej firmy</b>\n \n<b>email</b> 📬: biznesowyadres@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.+D%C5%82uga+16,+31-146+Krak%C3%B3w'>ul. Długa 16, 31-146 Kraków</a>\n🕘 9:00-20:00",
          {
            reply_markup: this.featuresMenu(language),
            parse_mode: "HTML",
          }
        );
        break;

      case "Wrocław":
      case "Вроцлав":
      case "Wroclaw":
        bot.sendMessage(
          userId,
          "<b>Adres twojej firmy</b>\n \n<b>email</b> 📬: biznesowyadres@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=O%C5%82awska+24,+50-123+Wroc%C5%82aw/'>ul. Oławska 24, 50-123 Wrocław</a>\n🕘 9:00-21:00",
          {
            reply_markup: this.featuresMenu(language),
            parse_mode: "HTML",
          }
        );
        break;
      case "Przemysl":
      case "Przemyśl":
      case "Пшемысль":
      case "Пшемишль":
        bot.sendMessage(
          userId,
          "<b>Adres twojej firmy</b>\n \n<b>email</b> 📬: biznesowyadres@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=Plac+Na+Bramie+5,+37-700+Przemyśl/'>ul. Plac na bramie 5, 37-700 Przemyśl</a>\n🕘 8:00-18:00",
          {
            reply_markup: this.featuresMenu(language),
            parse_mode: "HTML",
          }
        );
        break;
      case "Gdansk":
      case "Gdańsk":
      case "Гданьск":
      case "Гданськ":
        bot.sendMessage(
          userId,
          "<b>Adres twojej firmy</b>\n \n<b>email</b> 📬: biznesowyadres@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=Podwale+Staromiejskie+94,+80-844+Gdańsk/'>ul. Podwale Staromiejskie 94/95, 80-844 Gdańsk</a>\n🕘 9:00-21:00",
          {
            reply_markup: this.featuresMenu(language),
            parse_mode: "HTML",
          }
        );
        break;
      case "Lodz":
      case "Łódź":
      case "Лодзь":
        bot.sendMessage(
          userId,
          "<b>Adres twojej firmy</b>\n \n<b>email</b> 📬: biznesowyadres@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.Piotrkowska+97+L.+UZ+3,+90-425+Lódź/'>ul.Piotrkowska 97 L. UZ 3, 90-425 Lódź</a>\n🕘 9:00-21:00",
          {
            reply_markup: this.featuresMenu(language),
            parse_mode: "HTML",
          }
        );
        break;
      case "Warszawa":
      case "Варшава":
        bot.sendMessage(
          userId,
          "<b>Adres twojej firmy</b>\n \n<b>email</b> 📬: biznesowyadres@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=al.+Jerozolimskie+42,+00-042+Warszawa/'>Aleje Jerozolimskie 42, 00-042 Warszawa</a>\n🕘 9:00-21:00",
          {
            reply_markup: this.featuresMenu(language),
            parse_mode: "HTML",
          }
        );
        break;
      case "KrakowPKP":
      case "Kraków PKP":
      case "Краков ПКП":
      case "Краків ПКП":
        bot.sendMessage(
          userId,
          "<b>Adres twojej firmy</b>\n \n<b>email</b> 📬: biznesowyadres@gmail.com\n \n📍 <a href='https://www.google.com/maps/search/?api=1&query=ul.Pawia+5A,+31-154+Kraków/'>ul.Pawia 5a (Lokal 23), 31-154 Kraków</a>\n🕘 9:00-21:00",
          {
            reply_markup: this.featuresMenu(language),
            parse_mode: "HTML",
          }
        );
        break;
      case "Rzeszow":
      case "Rzeszów":
      case "Жешув":
        bot.sendMessage(
          userId,
          "<b>Adres twojej firmy</b>\n \n<b>email</b> 📬: biznesowyadres@gmail.com\n \n📍 <a href='https://maps.app.goo.gl/wXHnDweKBnkqpa5fA'>ul. Świętego Mikołaja 7, 35-005 Rzeszów</a>\n🕘 8:00-20:00",
          {
            reply_markup: this.featuresMenu(language),
            parse_mode: "HTML",
          }
        );
        break;
      case "Poznan":
      case "Poznań":
      case "Познань":
        bot.sendMessage(
          userId,
          "<b>Adres twojej firmy</b>\n \n<b>email</b> 📬: biznesowyadres@gmail.com\n \n📍 <a href='https://maps.app.goo.gl/gMUcWtqfekznnd8c7'>ul. Głogowska 51/2, 60-738 Poznań</a>\n🕘 9:00-21:00",
          {
            reply_markup: this.featuresMenu(language),
            parse_mode: "HTML",
          }
        );
        break;
      case "Lublin":
      case "Люблин":
      case "Люблін":
        bot.sendMessage(
          userId,
          "<b>Adres twojej firmy</b>\n \n<b>email</b> 📬: biznesowyadres@gmail.com\n \n📍 <a href='https://maps.app.goo.gl/Sb7yJuHtXfn1tVB96'>ul. 1 Maja 30, 20-410 Lublin</a>\n🕘 8:00-20:00",
          {
            reply_markup: this.featuresMenu(language),
            parse_mode: "HTML",
          }
        );
        break;
      case "Szczecin":
      case "Щецин":
        bot.sendMessage(
          userId,
          "<b>Adres twojej firmy</b>\n \n<b>email</b> 📬: biznesowyadres@gmail.com\n \n📍 <a href='https://maps.app.goo.gl/3Rq4hHXkRjq9Ms757'>ul. Edmunda Bałuki 20, 70-407 Szczecin</a>\n🕘 9:00-21:00",
          {
            reply_markup: this.featuresMenu(language),
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
      ukr: "Поточний курс на даний момент:",
    };
    bot.sendMessage(userId, actualCurseMsg[language], {
      reply_markup: JSON.stringify({ inline_keyboard: buttons }),
    });
    this.sendContactsForUser(text, userId);
    return JSON.stringify({ inline_keyboard: buttons });
  }
  sendContactsForUser(text, userId) {
    const usersBaseData = fs.readFileSync("usersBase.json");
    const usersBase = JSON.parse(usersBaseData);
    const user = usersBase.find((user) => user.userId === userId);
    const language = user.language;
    let phoneNumber;
    const contactName = {
      en: "Contact us",
      ru: "Связаться с нами",
      pl: "Skontaktuj się z nami",
      ukr: "Зв'яжіться з нами",
    };
    switch (text) {
      case "Krakow":
      case "Краков":
      case "Kraków":
      case "Краків":
        phoneNumber = "+48453323337"; // Номер телефона для отправки сообщения
        break;

      case "Wrocław":
      case "Вроцлав":
      case "Wroclaw":
        phoneNumber = "+48453323337";
        break;
      case "Przemysl":
      case "Przemyśl":
      case "Пшемысль":
      case "Пшемишль":
        phoneNumber = "+48453323337";
        break;
      case "Gdansk":
      case "Gdańsk":
      case "Гданьск":
      case "Гданськ":
        phoneNumber = "+48453323337";
        break;
      case "Lodz":
      case "Łódź":
      case "Лодзь":
        phoneNumber = "+48453323337";
        break;
      case "Warszawa":
      case "Варшава":
        phoneNumber = "+48453323337";
        break;
      case "KrakowPKP":
      case "Kraków PKP":
      case "Краков ПКП":
      case "Краків ПКП":
        phoneNumber = "+48453323337";
        break;
      case "Rzeszow":
      case "Rzeszów":
      case "Жешув":
        phoneNumber = "+48453323337";
        break;
      case "Poznan":
      case "Poznań":
      case "Познань":
        phoneNumber = "+48453323337";
        break;
      case "Lublin":
      case "Люблин":
      case "Люблін":
        phoneNumber = "+48453323337";
        break;
      case "Szczecin":
      case "Щецин":
        phoneNumber = "+48453323337";
        break;

      default:
        break;
    }
    const chatUrl = `https://t.me/${phoneNumber}`;

    const keyboard = {
      inline_keyboard: [[{ text: contactName[language], url: chatUrl }]],
      resize_keyboard: true, // Разрешить кнопкам изменять размер для соответствия экрану
    };
    const managerText = {
      en: "Contact the manager",
      ru: "Связь с менеджером",
      pl: "Kontakt z menedżerem",
      ukr: "Зв'яжіться з менеджером",
    };
    setTimeout(() => {
      bot.sendMessage(userId, managerText[language], {
        reply_markup: JSON.stringify(keyboard),
        resize_keyboard: true,
      });
      this.whatelse(userId, language);
    }, 1000);
  }
  whatelse(userId, language) {
    let text = {
      en: "Shall we look at something else?",
      ru: "Посмотрим что-то еще?",
      pl: "Zobaczymy coś jeszcze?",
      ukr: "Подивимось ще щось?",
    };
    bot.sendMessage(userId, text[language], {
      reply_markup: this.featuresMenu(language),
      resize_keyboard: true,
    });
  }
  sendGeneralMenu(userInput, language) {
    const chatId = userInput.chat.id;
    let text = {
      en: "Anything else?",
      ru: "Что-то еще?",
      pl: "Coś jeszcze?",
      ukr: "Щось ще?",
    };
    bot.sendMessage(chatId, text[language], {
      reply_markup: this.generalMenu(language),
      resize_keyboard: true,
    });
  }
  selectCity(userLanguage, userInput) {
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
      EUR: "🇪🇺", // Евро
      USD: "🇺🇸", // Доллар США
      GBP: "🇬🇧", // Фунт стерлингов
      CHF: "🇨🇭", // Швейцарский франк
      ILS: "🇮🇱", // Израильский шекель
      CNY: "🇨🇳", // Китайский юань
      TRY: "🇹🇷", // Турецкая лира
      CAD: "🇨🇦", // Канадский доллар
      AUD: "🇦🇺", // Австралийский доллар
      NOK: "🇳🇴", // Норвежская крона
      SEK: "🇸🇪", // Шведская крона
      CZK: "🇨🇿", // Чешская крона
      HUF: "🇭🇺", // Венгерский форинт
      HKD: "🇭🇰", // Гонконгский доллар
      ISK: "🇮🇸", // Исландская крона
      JPY: "🇯🇵", // Японская иена
      AED: "🇦🇪", // Дирхам ОАЭ
      UAH: "🇺🇦", // Гривна (Украина)
      BGN: "🇧🇬", // Лев (Болгария)
      RON: "🇷🇴", // Лей (Румыния)
      EUB: "🇪🇺",
    };

    return flagEmojis[countryCode] || "";
  }
  sendAboutInfo(language, userInput) {
    const chatId = userInput.chat.id;
    const instagramIcon = "📷"; // Символ, похожий на Instagram
    const facebookIcon = "🅕"; // Символ, похожий на Facebook

    const instagramUrl =
      "https://www.instagram.com/cliptech.inc/?igsh=MTEwdThwMXRycWgxbw%3D%3D&utm_source=qr"; // замените на ваш URL Instagram
    const facebookUrl =
      "https://www.facebook.com/profile.php?id=61567262404118"; // замените на ваш URL Facebook

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: `${instagramIcon} Instagram`, url: instagramUrl },
            { text: `${facebookIcon} Facebook`, url: facebookUrl },
          ],
        ],
      },
    };
    let message = {
      en: "Our links to Instagram and Facebook:",
      ru: "Наши ссылки на Instagram и Facebook:",
      pl: "Nasze linki do Instagrama i Facebooka:",
      ukr: "Наші посилання на Instagram та Facebook:"
    };
    bot.sendMessage(chatId, message[language], options);
    setTimeout(() => {
      this.sendGeneralMenu(userInput, language);
    }, 2000);
  }
  actualMultitul(language, userInput) {
    const chatId = userInput.chat.id;

    // Объект с переводами для разных языков
    const translations = {
      pl: {
        news: {
          title: "Wiadomości",
          content:
            "Tutaj będą świeże wiadomości o Twoich produktach, wydarzeniach i ofertach. Śledź aktualizacje!",
        },
        prices: {
          title: "Ceny usług",
          content:
            "Wyświetlaj aktualne ceny swoich usług, aby użytkownicy mogli szybko zapoznać się z cennikiem.",
        },
        promotions: {
          title: "Specjalne promocje",
          content:
            "Informuj klientów o zniżkach i promocjach, aby nie przegapili korzystnych ofert.",
        },
        faq: {
          title: "FAQ",
          content:
            "Podaj użytkownikom informacje na temat często zadawanych pytań lub przydatne porady.",
        },
        initialMessage: "Wybierz sekcję, aby dowiedzieć się więcej:",
        backToMainMenu: "Do głównego menu"
      },
      en: {
        news: {
          title: "News",
          content:
            "Here you will find fresh news about your products, events, and offers. Stay updated!",
        },
        prices: {
          title: "Service Prices",
          content:
            "Display the current prices of your services so users can quickly check the price list.",
        },
        promotions: {
          title: "Special Promotions",
          content:
            "Inform customers about discounts and promotions so they don't miss out on great deals.",
        },
        faq: {
          title: "FAQ",
          content:
            "Provide users with information about frequently asked questions or useful tips.",
        },
        initialMessage: "Choose a section to learn more:",
        backToMainMenu: "Back to main menu"
      },
      ru: {
        news: {
          title: "Новости",
          content:
            "Здесь будут свежие новости о ваших продуктах, событиях и предложениях. Следите за обновлениями!",
        },
        prices: {
          title: "Цены на услуги",
          content:
            "Отображайте актуальные цены на ваши услуги, чтобы пользователи могли быстро ознакомиться с прайсом.",
        },
        promotions: {
          title: "Специальные акции",
          content:
            "Информируйте клиентов о скидках и акциях, чтобы они не упустили выгодные предложения.",
        },
        faq: {
          title: "FAQ",
          content:
            "Предоставьте пользователям информацию о часто задаваемых вопросах или полезных советах.",
        },
        initialMessage: "Выберите раздел, чтобы узнать больше:",
        backToMainMenu: "В главное меню"
      },
      ukr: {
        news: {
          title: "Новини",
          content:
            "Тут будуть свіжі новини про ваші продукти, події та пропозиції. Слідкуйте за оновленнями!",
        },
        prices: {
          title: "Ціни на послуги",
          content:
            "Показуйте актуальні ціни на ваші послуги, щоб користувачі могли швидко ознайомитися з прайсом.",
        },
        promotions: {
          title: "Спеціальні акції",
          content:
            "Інформуйте клієнтів про знижки та акції, щоб вони не пропустили вигідні пропозиції.",
        },
        faq: {
          title: "FAQ",
          content:
            "Надайте користувачам інформацію про часто задавані питання або корисні поради.",
        },
        initialMessage: "Виберіть розділ, щоб дізнатися більше:",
        backToMainMenu: "В головне меню"
      }
    };

    // Получаем переводы для выбранного языка
    const selectedLang = translations[language] || translations.pl; // По умолчанию используем польский

    const sections = {
      news: selectedLang.news,
      prices: selectedLang.prices,
      promotions: selectedLang.promotions,
      faq: selectedLang.faq,
    };

    // Создаем кнопки для каждого раздела и главного меню
    const inlineKeyboard = [
      [
        { text: sections.news.title, callback_data: "toggle_news" },
        { text: sections.prices.title, callback_data: "toggle_prices" },
      ],
      [
        { text: sections.promotions.title, callback_data: "toggle_promotions" },
        { text: sections.faq.title, callback_data: "toggle_faq" },
      ],
      [{ text: selectedLang.backToMainMenu, callback_data: "go_to_main_menu" }],
    ];

    // Начальное сообщение на выбранном языке
    let initialMessage = selectedLang.initialMessage;

    // Отправляем сообщение с кнопками
    bot
      .sendMessage(chatId, initialMessage, {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      })
      .then((sentMessage) => {
        // Хранение текущего состояния
        const sectionStates = {
          news: false,
          prices: false,
          promotions: false,
          faq: false,
        };

        // Обработка нажатий на кнопки
        const handleCallbackQuery = (query) => {
          const { data } = query;
          let responseMessage = initialMessage;

          // Логика разворачивания и сворачивания текста
          switch (data) {
            case "toggle_news":
              sectionStates.news = !sectionStates.news; // Переключаем состояние
              responseMessage += sectionStates.news
                ? `\n\n${sections.news.content}`
                : "";
              break;
            case "toggle_prices":
              sectionStates.prices = !sectionStates.prices;
              responseMessage += sectionStates.prices
                ? `\n\n${sections.prices.content}`
                : "";
              break;
            case "toggle_promotions":
              sectionStates.promotions = !sectionStates.promotions;
              responseMessage += sectionStates.promotions
                ? `\n\n${sections.promotions.content}`
                : "";
              break;
            case "toggle_faq":
              sectionStates.faq = !sectionStates.faq;
              responseMessage += sectionStates.faq
                ? `\n\n${sections.faq.content}`
                : "";
              break;
            case "go_to_main_menu":
              // Удаляем обработчик перед вызовом функции
              bot.removeListener("callback_query", handleCallbackQuery);
              // Удаляем текущее сообщение с кнопками
              bot
                .deleteMessage(chatId, query.message.message_id)
                .then(() => {
                  // После удаления сообщения вызываем функцию для перехода в главное меню
                  this.whatelse(chatId, language);
                })
                .catch((err) => {
                  console.error("Error deleting message:", err);
                });
              return;
            default:
              break;
          }

          // Проверяем, изменилось ли сообщение
          if (responseMessage !== query.message.text) {
            // Обновляем сообщение с кнопками
            bot
              .editMessageText(responseMessage, {
                chat_id: chatId,
                message_id: query.message.message_id,
                reply_markup: {
                  inline_keyboard: inlineKeyboard,
                  resize_keyboard: true,
                  one_time_keyboard: false,
                },
              })
              .catch((err) => {
                console.error("Error editing message:", err);
              });
          }

          bot.answerCallbackQuery(query.id); // Подтверждаем нажатие кнопки
        };

        // Добавляем обработчик событий только один раз
        bot.on("callback_query", handleCallbackQuery);
      });
  }

  calculateSum(sum, userId) {
    const usersBaseData = fs.readFileSync("usersBase.json");
    const usersBase = JSON.parse(usersBaseData);
    const user = usersBase.find((user) => user.userId === userId);
    const language = user.language;
    console.log(language);

    let rate = 3.905; // базовый курс по умолчанию
    if (kursToCalculate && kursToCalculate.USD && kursToCalculate.USD.ds) {
      rate = parseFloat(kursToCalculate.USD.ds);
      console.log(rate);
    }

    // Рассчитываем итоговую сумму с учетом комиссии 2.6%
    const result = (sum / rate) * (1 - 0.026);
    let message = `${result.toFixed(0)} usdt`;
    let text = {
      en: `We calculated, it came out to ${message}. Just in case, check with the manager.`,
      ru: `Мы посчитали, вышло ${message}. На всякий случай уточните у менеджера.`,
      pl: `Policzyliśmy, wyszło ${message}. Na wszelki wypadek sprawdź to z menedżerem.`,
      ukr: `Ми порахували, вийшло ${message}. Про всяк випадок уточніть у менеджера.`,
    };
    console.log("Курс для расчета:", rate);
    console.log("Исходная сумма в злотых:", sum);
    console.log("Результирующая сумма в USDT:", result.toFixed(0));
    bot.sendMessage(userId, text[language], {
      reply_markup: this.featuresMenu(language),
      resize_keyboard: true,
    });
  }
  firstNewsPaper(language) {
    const paymentInfo = {
      ru: "<b>Оплата картой</b> 💳\nУважаемые клиенты, с радостью сообщаем вам, что теперь вы можете обменивать свои деньги с помощью банковской карты.\nЭта транзакция будет включать минимальную плату:\nПольская карта - 1,0% от курса продажи\nИностранная карта - 3,0% от курса продажи\n(Лимит единиц транзакций 1000)",
      en: "<b>Card Payment</b> 💳\nDear Customers, we are pleased to inform you that you can now exchange your money using a debit/credit card.\nThis transaction will incur a minimum fee:\nPolish card - 1.0% to the selling rate\nForeign card - 3.0% to the selling rate\n(Transaction units limit 1000)",
      pl: "<b>Płatność kartą</b> 💳\nSzanowni Klienci, z przyjemnością informujemy, że od teraz możesz wymieniać swoje pieniądze za pomocą karty płatniczej.\nTa transakcja będzie podlegać minimalnej opłacie:\nKarta polska - 1,0% do kursu sprzedaży\nKarta zagraniczna - 3,0% do kursu sprzedaży\n(Limit jednostek transakcji 1000)",
      ukr: "<b>Оплата карткою</b> 💳\nШановні клієнти, ми раді повідомити вам, що тепер ви можете обмінювати свої гроші за допомогою банківської картки.\nЦя транзакція вимагатиме мінімальну комісію:\nПольська картка - 1,0% від курсу продажу\nІноземна картка - 3,0% від курсу продажу\n(Обмеження одиниць транзакцій 1000)",
    };
    return paymentInfo[language];
  }
}
const myBot = new NewBot(); // Создаем экземпляр класса
myBot.commands();
// myBot.cerrentCource();
