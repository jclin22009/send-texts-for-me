'''
Port 3000 is the message sending port and 5000 is the webhook port.
'''
import requests
import os
import openai
import time
from rich import print
from flask import Flask, request
from dotenv import load_dotenv

load_dotenv()

handles = os.environ['HANDLES'].split(', ')

def send_message(message, recipient_id):
    '''
    Sends iMessage message with Jared. Jared also allows you to attach things
    but I'm too lazy to implement that
    '''
    message_set = message.split(".")
    for msg in message_set:
        msg = "AI: " + msg
        if msg != "AI: ": # hacky workaround for empty messages TODO
            r = requests.post(
                "http://localhost:3000/message",
                json={"body": {"message": msg}, "recipient": {"handle": recipient_id}}
            )
        # time.sleep(3 + len(msg) / 5) # simulate typing speed (this assumes 300 char per minute typing speed), plus a 3-sec reading delay
        print(r.text)

def initialize_gpt():
    openai.api_key = os.environ['OPENAI_API_KEY']

def get_gpt_response(message):
    response = openai.Completion.create(
        engine="text-davinci-002", 
        prompt=message, stop="You:", 
        temperature=0.5,
        max_tokens=200,
        top_p=1.0,
        frequency_penalty=0.5,
        presence_penalty=0.0
    )
    return response.choices[0]['text']

def handle_response_cycle(message, request, messageHistory):
    '''
    Prompts GPT with relevant message (especially formatting to optimize result) and
    prints the response.
    '''
    promptString = "Me: " + message['body'] + "\n" + "You: "
    if message['sender'] in messageHistory:
        response = get_gpt_response(messageHistory[message['sender']] + promptString)
        messageHistory[message['sender']] += "\n" + promptString + response.lstrip("\n")
    else:
        response = get_gpt_response(promptString)
        messageHistory[message['sender']] = promptString.lstrip("\n") + response.lstrip("\n")

    print("[bold]Message history:[/bold]\n", messageHistory[message['sender']])
    processed_response = clean_response(response)
    
    if not processed_response or processed_response == " ": # TODO not processed_response.strip() doesn't work?
        print("*****AI response is empty*****")
    else:
        send_message(processed_response, message['sender'])

def clean_response(response):
    return response.strip("\n").strip()

def should_shutup(message):
    reactStrings = ['Laughed at', 'Loved', 'Liked', 'Disliked', 'Emphasized', 'Questioned']
    for item in reactStrings:
        if message['body'].startswith(item):
            print("Reaction detected. [italic]Skipped![/italic]")
            return True
    if message['body'] == "\ufffc":
        print("Only image detected. [italic]Skipped![/italic]")
        return True # this means the message is just an image with nothing else
    return False

app = Flask(__name__)
@app.route('/webhook', methods=['POST'])
def webhook():
    '''
    Gets invoked whenever a message is sent to the webhook. TODO Has bug where sending messages to group chats breaks JSON syntax, as recipients
    becomes a nested item (can't just do request.json['recipient']['isMe])
    '''
    if request.method == 'POST':
        print("a", request.json)
        f = open("output.json", "w")
        # f.write(json.dumps(request.json, indent=2))
        f.close()
        print("===== Messaging detected ======")
        message = {'body': request.json['body']['message'],
            'recipient': request.json['recipient']['handle'],
            'sender': request.json['sender']['handle'],
            'isSentFromMe': request.json['sender']['isMe']}

        if (should_shutup(message)):
            return "Webhook received and ignored lol (cuz it's a reaction)" 
        
        if 'participants' in request.json['recipient']:
            print("---- Group chat detected ---- ")
            # message['sender'] = request.json['recipient']['handle']
            # handle_response_cycle(message, request, messageHistory)

        elif message['isSentFromMe']:
            print("---- Message from me ----")
            if request.json['recipient']['isMe'] \
                or request.json['recipient']['handle'] in handles:
                if not message['body'].startswith('AI:'): # escape infinite response loop
                    handle_response_cycle(message, request, messageHistory)
            else:
                print("Self-sent message [italic]ignored![/italic]")

        else:
            print("---- 1 on 1 response ----")
            handle_response_cycle(message, request, messageHistory)
        return "Webhook received!"

if __name__ == '__main__':
    initialize_gpt()
    messageHistory = {}
    app.run(port=5000)