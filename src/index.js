import PostalMime from 'postal-mime';

async function streamToArrayBuffer(stream, streamSize) {
	let result = new Uint8Array(streamSize);
	let bytesRead = 0;
	const reader = stream.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		result.set(value, bytesRead);
		bytesRead += value.length;
	}
	return result;
}

function getDetailFromEmailText(emailText, keyword) {
	const lines = emailText.split('\n');
	let detailLine = lines.find(line => line.includes(keyword));
	if (!detailLine) {
		return 'Detail not found';
	}
	if (keyword === 'Fee') {
		const feePattern = /Rs\.\s*([\d,]+\.\d{2})/;
		const feeMatch = detailLine.match(feePattern);
		return feeMatch ? feeMatch[1].trim() : 'Detail not found';
	}
	return detailLine.split(': ').slice(-1)[0].trim();
}

function getFundsTransferName(emailText) {
	const nameRegex = /SENT TO\s+(\S+)/;
	const match = emailText.match(nameRegex);
	return match ? match[1].trim() : 'Name not found';
}

function getTransactionAmount(emailText) {
	const amountPattern = /PKR\s([\d,]+\.\d{2})/;
	const match = emailText.match(amountPattern);
	return match ? match[1] : 'Amount not found';
};


export default {
	async email(message, env, ctx) {
		const rawEmail = await streamToArrayBuffer(message.raw, message.rawSize);
		const parser = new PostalMime()
		const parsedEmail = await parser.parse(rawEmail)
		const emailText = parsedEmail.text

		const beneficiaryAccount = getDetailFromEmailText(emailText, 'Beneficiary Account')
		const amount = getTransactionAmount(emailText);
		const emailDetails = {
			amount,
			beneficiaryAccount
		};
		console.log(emailDetails);
		if (env.DEBUG) {
			await fetch(env.DEV_CONSUME_URL, {
				method: "POST",
				body: JSON.stringify(emailDetails),
			});
		}
		else {
			await fetch(env.PROD_CONSUME_URL, {
				method: "POST",
				body: JSON.stringify(emailDetails),
			});
		}
	},
	async fetch(request, env, ctx) {
		return new Response('405 Method Not Allowed', { status: 405 });
	}
}
