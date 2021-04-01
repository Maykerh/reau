const REAUContract = '0x4c79b8c9cB0BD62B047880603a9DEcf36dE28344';
const WBNBContract = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
const CBRLContract = '0x9e691fd624410d631c082202b050694233031cb7';

var maskOptions = {
	mask: Number,
	scale: 2,
	signed: false,
	thousandsSeparator: '.',
	padFractionalZeros: false,
	normalizeZeros: false,
	radix: ',',
	mapToRadix: ['.'],
	max: 999999999999999,
};

var maskOptionsFrom = Object.assign({}, maskOptions);
maskOptionsFrom.scale = 0;

const valueFields = {
	from: document.getElementById('fromCurrency'),
	fromMask: IMask(document.getElementById('fromCurrency'), maskOptionsFrom),
	to: document.getElementById('toCurrency'),
	toMask: IMask(document.getElementById('toCurrency'), maskOptions),
};

var REAUtoBRL = null;

var isCotationActive = false;
var isCotationFocused = false;

function getREAUValue() {
	REAUInfoProvider.getInfo().then(function (info) {
		REAUtoBRL = info.reauBrlPrice;

		if (valueFields.fromMask.typedValue == 0) {
			valueFields.fromMask.typedValue = 1000000;
		}

		calculateValues(valueFields.fromMask, valueFields.toMask);

		adjustValueFieldsToContent();
	});
}

getREAUValue();

function normalizeENotation(number) {
	if (Math.abs(number) < 1.0) {
		var e = parseInt(number.toString().split('e-')[1]);

		if (e) {
			number *= Math.pow(10, e - 1);
			number = '0.' + new Array(e).join('0') + number.toString().substring(2);
		}
	} else {
		var e = parseInt(number.toString().split('+')[1]);

		if (e > 20) {
			e -= 20;
			number /= Math.pow(10, e);
			number += new Array(e + 1).join('0');
		}
	}

	return number;
}

function adjustValueFieldsToContent() {
	valueFields.from.style.width = valueFields.from.value.length * 0.62 + 'em';
	valueFields.to.style.width = valueFields.to.value.length * 0.62 + 'em';
}

function formatValueToDisplay(brlValue) {
	var formatted = new Intl.NumberFormat('pt-br', {
		maximumFractionDigits: 9,
		maximumSignificantDigits: 9,
	}).format(brlValue);

	return formatted == 'NaN' ? '0,00' : formatted;
}

const humanizedTooltip = tippy(document.querySelector('#humanized-value'));
humanizedTooltip.setContent('Nenhum valor informado');

function updateHumanizedValue() {
	var word = valueFields.fromMask.unmaskedValue.toString().extenso();

	humanizedTooltip.setContent(word + ' de $REAU');
}

function calculateValues(inputModified, inputTarget) {
	var unmaskedModifiedValue = inputModified.unmaskedValue;

	var convertedValue = '0,00';

	if (inputModified.el.input.id == valueFields.to.id) {
		convertedValue = parseFloat(unmaskedModifiedValue) / REAUtoBRL;
		convertedValue = parseFloat(convertedValue).toFixed(0);
	} else {
		convertedValue = parseFloat(unmaskedModifiedValue) * REAUtoBRL;
	}

	inputTarget.typedValue = normalizeENotation(convertedValue);

	updateHumanizedValue();
}

function changeCotationActiveStatus(activate) {
	var cotacao = document.getElementById('cotation-values');

	if (activate) {
		cotacao.classList.add('cotacao-active');
		isCotationActive = true;
	} else {
		cotacao.classList.remove('cotacao-active');
		isCotationActive = false;
	}
}

function expandValueFields() {
	valueFields.from.style.width = valueFields.to.style.width = '100%';
}

valueFields.from.onfocus = valueFields.to.onfocus = function () {
	this.select();
	expandValueFields();
	changeCotationActiveStatus(true);

	isCotationFocused = true;
};

valueFields.from.onblur = valueFields.to.onblur = function () {
	adjustValueFieldsToContent();

	isCotationFocused = false;
	inputModifiedLastValue = '0,00';

	changeCotationActiveStatus(false);
};

valueFields.from.onkeyup = function (event) {
	if (event.keyCode != 9) {
		calculateValues(valueFields.fromMask, valueFields.toMask);
	}
};

valueFields.to.onkeyup = function (event) {
	if (event.keyCode != 9) {
		calculateValues(valueFields.toMask, valueFields.fromMask);
	}
};
