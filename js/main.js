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

function saveUserWallet() {
	var wallet = document.getElementById('wallet-input').value;

	localStorage.setItem('reau-user-wallet', wallet);

	loadUserWalletBalance();
}

function loadUserWallet() {
	var wallet = localStorage.getItem('reau-user-wallet');

	if (wallet != null) {
		document.getElementById('wallet-input').value = wallet;
	}
}

function loadUserWalletBalance() {
	var wallet = localStorage.getItem('reau-user-wallet');

	if (!wallet) {
		getREAUValue();
		return;
	}

	var url =
		'https://api.bscscan.com/api?module=account&action=tokenbalance&tag=latest&apikey=xxx';
	url += '&address=' + localStorage.getItem('reau-user-wallet');
	url += '&contractaddress=' + REAUContract;

	axios
		.get(url)
		.then(function (response) {
			var balance = response.data.result;

			if (balance != null) {
				balance = balance.toString().replace(balance.toString().substr(-9), '');

				valueFields.fromMask.typedValue = balance;
			}
		})
		.catch(function (err) {
			console.error(err);

			alert('Ocorreu um erro, não foi possível carregar o saldo desta carteira');
		})
		.finally(function () {
			adjustValueFieldsToContent();
			getREAUValue();
		});
}

async function getREAUValue() {
	handleLoading(true);

	const info = await REAUInfoProvider.getInfo();

	REAUtoBRL = info.reauBrlPrice;

	if (valueFields.fromMask.typedValue == 0) {
		valueFields.fromMask.typedValue = 1000000;
	}

	calculateValues(valueFields.fromMask, valueFields.toMask);

	adjustValueFieldsToContent();

	handleLoading(false);
}

loadUserWallet();
loadUserWalletBalance();

function handleLoading(loading) {
	var refreshButton = document.getElementById('refresh-button');

	if (loading) {
		refreshButton.classList.add('refresh-button-loading');
	} else {
		refreshButton.classList.remove('refresh-button-loading');
	}
}

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
	if (window.mobileCheck()) {
		return;
	}

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

	addToHistory();

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

async function refreshData() {
	await getREAUValue();
}

function addToHistory() {
	let newEntry = document.createElement('div');
	let now = new Date();

	newEntry.innerHTML = `${now.toLocaleTimeString()} <b>$REAU</b>: <span class="history-value"">${
		valueFields.fromMask.value
	}</span> <b>R$</b>: <span class="history-value"">${valueFields.toMask.value}</span>`;
	document.querySelector('#history').prepend(newEntry);
}

setInterval(function () {
	refreshData();
}, 15000);

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
		lastInput = 'reau';

		calculateValues(valueFields.fromMask, valueFields.toMask);
	}
};

valueFields.to.onkeyup = function (event) {
	if (event.keyCode != 9) {
		lastInput = 'real';

		calculateValues(valueFields.toMask, valueFields.fromMask);
	}
};

window.mobileCheck = function () {
	let check = false;
	(function (a) {
		if (
			/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
				a
			) ||
			/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
				a.substr(0, 4)
			)
		)
			check = true;
	})(navigator.userAgent || navigator.vendor || window.opera);
	return check;
};
