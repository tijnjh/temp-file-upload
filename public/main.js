const [elInitial, elSuccess, elResult] = [
  document.getElementById("initial"),
  document.getElementById("success"),
  document.getElementById("result"),
];

Dropzone.options.uploadZone = {
  paramName: "f",
  maxFilesize: 2000,
  init: function () {
    this.on("success", (_, response) => {
      elInitial.style.display = "none";
      elSuccess.style.display = "block";
      elResult.textContent = response;
    });
  },
};
