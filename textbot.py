'''
Port 3000 is the message sending port and 5000 is the webhook port.

TODO
priority
- Add a way to send messages to groups
- Add name awareness (running into bug where 'name:' is printed at end of message)

medium
- Append messages rapidly sent to me in succession into a single message/API call
- fine tune
- refine stop sequencing so it can stop a conversation

min
- make terminal output pretty
'''
import requests
import os
import openai
import string
from flask import Flask, request
from profanity_filter import ProfanityFilter

def send_message(message, recipient_id):
    '''
    Sends iMessage message with Jared. Jared also allows you to attach things
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

def handle_response_cycle(message, request):
    '''
    Prompts GPT with relevant message (especially formatting to optimize result) and
    prints the response.
    '''
    response = get_gpt_response("Me: " + message['body'] + "\n" + "You: ")
    # response = get_gpt_response(name + ": " + message['body'] + "\n")
    # try:
    #     response += request.json['sender']['givenName'] + ": "
    # except:
    #     response += "You: "
    print("message: ", message['body'])
    print("sending to: ", message['sender'])
    print("ai response: ", response)
    processed_response = clean_response(response)
    if not processed_response or processed_response == " ":
        print("*****AI response is empty*****")
    else:
        send_message("AI: " + response.strip("\n"), message['sender'])

def clean_response(response):
    # response = pf.censor(response)
    return response.strip("\n")
    # return response[:response.find("\n")]
    # lastPunc = max(response.rfind(i) for i in "?!.")
    # return response if lastPunc == -1 else response[:lastPunc]
    # return response.rstrip(" .?!")

app = Flask(__name__)
@app.route('/webhook', methods=['POST'])
def webhook():
    '''
    Gets invoked whenever a message is sent to the webhook. TODO Has bug where sending messages to group chats breaks JSON syntax, as recipients
    becomes a nested item (can't just do request.json['recipient']['isMe])
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
            if request.json['recipient']['isMe'] \
                or request.json['recipient']['handle'] == "jclin2.2009@gmail.com" \
                or request.json['recipient']['handle'] == "+16509466066": # TODO very hacky
                if not message['body'].startswith('AI:'): # escape infinite response loop
                    handle_response_cycle(message, request)
        else:
            print("---GENERAL RESPONSE!---")
            handle_response_cycle(message, request)
        return "Webhook received!"
    if request.method == 'GET':
        return "Get request received. But homie what are u trynna get??"


if __name__ == '__main__':
    initialize_gpt()
    pf = ProfanityFilter()
    name = input("What's your first name? ")
    app.run(port=5000)