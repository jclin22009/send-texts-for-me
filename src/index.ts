import axios from 'axios';
import express from 'express';
import { Configuration, OpenAIApi } from 'openai';

interface Message {
  sender: string;
  recipient: string;
  body: string;
}

const openaiConfiguration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(openaiConfiguration);

const REACT_STRINGS = [
  'Laughed at',
  'Loved',
  'Liked',
  'Disliked',
  'Emphasized',
  'Questioned'
] as const;

if (!process.env.HANDLES) {
  throw Error('Missing HANDLES environment variable');
}

const HANDLES = process.env.HANDLES.split(', ');

const messageHistory: Map<string, string> = new Map();

/**
 * Sends iMessage message with Jared. Jared also allows you to attach things
 * but I'm too lazy to implement that
 */
async function sendMessage(message: string, recipientId: string) {
  const messageSet = message.split('.');
  for (const rawMessage of messageSet) {
    if (rawMessage) {
      const message = `AI: ${rawMessage}`;
      const response = await axios.post('http://localhost:3000/message', {
        body: { message },
        recipient: { handle: recipientId }
      });
      console.log(response.data);
    }
  }
}

async function getGptResponse(message: string) {
  const response = await openai.createCompletion('text-davinci-002', {
    prompt: message,
    stop: 'You:',
    temperature: 0.5,
    max_tokens: 200,
    top_p: 1.0,
    frequency_penalty: 0.5,
    presence_penalty: 0.0
  });
  return response.data.choices?.[0].text ?? '';
}

/**
 * Prompts GPT with relevant message (especially formatting to optimize result) and
 * prints the response.
 */
async function handleResponseCycle(message: Message) {
  const promptString = `Me: ${message.body}\nYou: `;
  const senderMessageHistory = messageHistory.get(message.sender);
  let response: string;
  if (senderMessageHistory) {
    response = await getGptResponse(`${senderMessageHistory}${promptString}`);
    messageHistory.set(
      message.sender,
      `\n${promptString}${response.trimStart()}`
    );
  } else {
    response = await getGptResponse(promptString);
    messageHistory.set(
      message.sender,
      `${promptString.trimStart()}${response.trimStart()}`
    );
  }
  console.log(
    '[bold]Message history:[/bold]\n',
    messageHistory.get(message.sender)
  );
  const processedResponse = response.trim();
  if (!processedResponse || processedResponse == ' ') {
    console.log('*****AI response is empty*****');
  } else {
    sendMessage(processedResponse, message['sender']);
  }
}

function shouldShutup(message: Message) {
  for (const item in REACT_STRINGS) {
    if (message.body.startsWith(item)) {
      console.log('Reaction detected. [italic]Skipped![/italic]');
      return true;
    }
  }
  if (message.body == '\ufffc') {
    console.log('Only image detected. [italic]Skipped![/italic]');
    return true;
  }
  return false;
}

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('===== Messaging detected ======');

  if ('participants' in req.body.recipient) {
    console.log('---- Group chat detected ---- ');
    return res.send('Webhook received and ignored for group chat');
  }

  const message: Message = {
    sender: req.body.sender.handle,
    recipient: req.body.recipient.handle,
    body: req.body.body.message
  };

  if (req.body.sender.isMe) {
    console.log('---- Message from self ----');
    return res.send('Webhook received and ignored for self sent message');
  }

  if (
    HANDLES.includes(message.sender) &&
    HANDLES.includes(message.recipient) &&
    message.body.includes('AI: ')
  ) {
    console.log('---- Message from AI to self ----');
    return res.send('Webhook received and ignored for AI message to itself');
  }

  if (shouldShutup(message)) {
    return res.send("Webhook received and ignored lol (cuz it's a reaction)");
  }

  console.log('---- 1 on 1 response ----');
  console.log(req.body);
  handleResponseCycle(message);
  return res.send('Webhook received!');
});

app.listen(3001);