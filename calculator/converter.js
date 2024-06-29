// const SendRates = require('./index.js');
import {SendRates} from "../index.js";
class NewConverter {
  constructor() {
    this.sendRatesInstance = new SendRates();
    this.getCity();
  }

  getCity() {
    const city = document.getElementById("city");
    this.getCource(city.value);
    city.addEventListener("change", (e) => {
      console.log(e.target.value);
      this.getCource(e.target.value);
    });
  }
 async getCource(city) {
    console.log(city + " город передало");
    const result = this.sendRatesInstance.getCity(city);
    console.log(result);
  }
}

const converter = new NewConverter();
