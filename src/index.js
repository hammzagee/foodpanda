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

function extractOrderDetails(emailText) {
	return {
		orderTotal: emailText.match(/Order Total\s*Rs\.\s*([\d,.]+)/i)?.[1] || "Not Found",
		orderTime: emailText.match(/Order time[:\s]*([\d:APM\s]+)/i)?.[1]?.trim() || "Not Found",
		restaurantName: emailText.match(/Your order from\s+(.+?)\s+will be on/i)?.[1]?.trim() || "Not Found"
	};
}




export default {
	async email(message, env, ctx) {
		const rawEmail = await streamToArrayBuffer(message.raw, message.rawSize);
		const parser = new PostalMime()
		const parsedEmail = await parser.parse(rawEmail)
		const emailText = parsedEmail.text

		const { orderTotal, orderTime, restaurantName } = extractOrderDetails(emailText)
		const amount = getTransactionAmount(emailText);
		const orderDetails = {
			orderTotal,
			orderTime,
			restaurantName
		};
		console.log(orderDetails);
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
