import { createActor, student_wall_backend } from "../../declarations/student_wall_backend";
import { AuthClient } from "@dfinity/auth-client"
import { HttpAgent } from "@dfinity/agent";
import swal from 'sweetalert'

let actor = student_wall_backend;

const greetButton = document.getElementById("greet");
greetButton.onclick = async (e) => {
  e.preventDefault();

  greetButton.setAttribute("disabled", true);

  // Interact with backend actor, calling the greet method
  const greeting = await actor.greet();

  greetButton.removeAttribute("disabled");
  swal("Your Principal ID is", greeting);
  // document.getElementById("greeting").innerText = greeting;

  return false;
};

const loginButton = document.getElementById("login");
loginButton.onclick = async (e) => {
  e.preventDefault();

  // create an auth client
  let authClient = await AuthClient.create();

  // start the login process and wait for it to finish
  await new Promise((resolve) => {
    authClient.login({
      identityProvider: process.env.II_URL,
      onSuccess: resolve,
    });
  });

  // At this point we're authenticated, and we can get the identity from the auth client:
  const identity = authClient.getIdentity();
  console.log("authClient: " + JSON.stringify(authClient, null, 2))
  console.log("identity: " + JSON.stringify(identity, null, 2))
  // Using the identity obtained from the auth client, we can create an agent to interact with the IC.
  const agent = new HttpAgent({ identity });
  console.log("agent: " + JSON.stringify(agent, null, 2))
  // Using the interface description of our webapp, we create an actor that we use to call the service methods.
  actor = createActor(process.env.STUDENT_WALL_BACKEND_CANISTER_ID, {
    agent,
  });
  console.log("actor: " + JSON.stringify(actor, null, 2));

  return false;
};


// main deal
document.addEventListener('alpine:init', () => {
  Alpine.store('messages', {
    messages: [],
    add (message) {
      if (this.messages.find(_message => _message.messageId === message.messageId))
        return
      this.messages.push(message)
    },
    async fetchAll () {
      for (let i =0; i < this.messages.length; i++)
        this.messages.pop()

      const response = await actor.getAllMessagesRanked();
      console.log(response)
      for (const message of response)
        this.add(message)
    }
  })

  Alpine.store('events', {
    async upVote(msgId) {
      const response = await actor.upVote(msgId);
      Alpine.store("messages").fetchAll()
      swal("Message", response);
      console.log(response);
    },
    async downVote(msgId) {
      const response = await actor.downVote(msgId);
      Alpine.store("messages").fetchAll()
      swal("Message", response);
      console.log(response);
    },
    async getVotes(msgId) {
      const response = await actor.getVoters(msgId);
      console.log(response);
    },
    async deleteMessage(msgId) {
      const response = await actor.deleteMessage(msgId);
      Alpine.store("messages").fetchAll()
      swal("Message", response);
      console.log(response);
    }
  })

  Alpine.store("messages").fetchAll()
})


//write message
document.querySelector("#writeForm").addEventListener("submit", async function(event){
  event.preventDefault();

  const btn = event.target.querySelector("#submit-btn");

  const inputText = document.getElementById("formText").value;


  if (document.getElementById("formText").value.length != 0){
      btn.setAttribute("disabled", true);
      const response = await actor.writeMessage({Text:inputText});
      swal("Message", "success", "success");
      document.getElementById("formText").value = "";
  }
  // await dbank_backend.compound();

  // show();
  Alpine.store("messages").fetchAll()
  btn.removeAttribute("disabled");

});
//update message
document.querySelector("#updateForm").addEventListener("submit", async function(event){
  event.preventDefault();

  const btn = event.target.querySelector("#update-btn");

  const id = parseInt(document.getElementById("updateVal").value);
  const inputText = document.getElementById("updateText").value;


  if (document.getElementById("updateText").value.length != 0){
      btn.setAttribute("disabled", true);
      // const response = await actor.updateMessage({messageId : id , Text: inputText});
      const response = await actor.updateMessage( id, {Text: inputText});
      // swal("Message", response);
      document.getElementById("updateText").value = "";
  }
  Alpine.store("messages").fetchAll()

  btn.removeAttribute("disabled");

});

Alpine.start()