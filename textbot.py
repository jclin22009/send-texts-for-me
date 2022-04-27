'''
Aight so port 3000 is the message sending port and 5000 is the webhook port.
'''
import requests
import os
import openai
import string
from flask import Flask, request

def send_message(message, recipient_id):
    '''
    Send iMessage message with Jared. Jared also allows you to attach things
    but I'm too lazy to implement that
    '''
    r = requests.post("http://localhost:3000/message",json={"body": {"message": message}, "recipient": {"handle": recipient_id}})
    print(r.text)

def initialize_gpt():
    openai.api_key = os.environ['OPENAI_API_KEY']

def get_gpt_response(message):
    response = openai.Completion.create(
        engine="text-davinci-002", 
        prompt=message, stop="You:", 
        temperature=0.5,
        max_tokens=60,
        top_p=1.0,
        frequency_penalty=0.5,
        presence_penalty=0.0
    )
    return response.choices[0]['text']

def handle_response_cycle(message):
    response = get_gpt_response("Me: " + message['body'] + "\n" + "You: ")
    print("message: ", message['body'])
    print("sending to: ", message['sender'])
    print("ai response: ", response)
    send_message("AI: " + response.strip("\n"), message['sender'])

def clean_response(response):
    return response
    # return response[:response.find("\n")]
    # lastPunc = max(response.rfind(i) for i in "?!.")
    # return response if lastPunc == -1 else response[:lastPunc]
    # return response.rstrip(" .?!")

app = Flask(__name__)
@app.route('/webhook', methods=['POST'])
def webhook():
    '''
    Gets invoked whenever a message is sent to the webhook. Has bug where sending messages to group chats breaks JSON syntax (??)
    '''
    if request.method == 'POST':
        print("POST request: ", request.json)
        print("===== Messaging detected ======")
        message = {'body': request.json['body']['message'],
            'recipient': request.json['recipient']['handle'],
            'sender': request.json['sender']['handle'],
            'isSentFromMe': request.json['sender']['isMe']}
        if message['isSentFromMe']:
            print("---- Message from me ----")
            if request.json['recipient']['isMe'] or request.json['recipient']['handle'] == "jclin2.2009@gmail.com": # TODO janky
                if not message['body'].startswith('AI:'):
                    handle_response_cycle(message)
        else:
            print("---GENERAL RESPONSE!---")
            handle_response_cycle(message)
        return "Webhook received!"
    if request.method == 'GET':
        return "Get request received. But homie what are u trynna get??"


if __name__ == '__main__':
    initialize_gpt()
    app.run(port=5000)