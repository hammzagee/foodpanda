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
		orderTotal: emailText.match(/Order Total\s*Rs\.\s*([\d,]+(?:\.\d{1,2})?)/i)?.[1] || "Not Found",
		orderTime: emailText.match(/Order time:\s*([\d-]+\s[\d:]+)/i)?.[1] || "Not Found",
		restaurantName: emailText.match(/Your order from\s*(.+?)\s*will be on/i)?.[1] || "Not Found",
	};
}

export default {
	async email(message, env, ctx) {
		const rawEmail = await streamToArrayBuffer(message.raw, message.rawSize);
		const parser = new PostalMime()
		const parsedEmail = await parser.parse(rawEmail)
		const emailText = parsedEmail.text

		const { orderTotal, orderTime, restaurantName } = extractOrderDetails(emailText)
		const orderDetails = {
			orderTotal,
			orderTime,
			restaurantName
		};
		console.log(orderDetails);
		if (env.DEBUG) {
			fetch(env.DEV_CONSUME_URL, {
				method: "POST",
				body: JSON.stringify(orderDetails),
			});
			return new Response('OK', { status: 200 });
		}
		else {
			await fetch(env.PROD_CONSUME_URL, {
				method: "POST",
				body: JSON.stringify(orderDetails),
			});
			return new Response('OK', { status: 200 });
		}
	},
	async fetch(request, env, ctx) {
		return new Response('405 Method Not Allowed', { status: 405 });
	}
}
