import { createActor, student_wall_backend } from "../../declarations/student_wall_backend";
import { AuthClient } from "@dfinity/auth-client"
import { HttpAgent } from "@dfinity/agent";
import swal from 'sweetalert'
// import Alpine from "alpine";

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

  // Using the identity obtained from the auth client, we can create an agent to interact with the IC.
  const agent = new HttpAgent({ identity });

  // Using the interface description of our webapp, we create an actor that we use to call the service methods.
  actor = createActor(process.env.STUDENT_WALL_BACKEND_CANISTER_ID, {
    agent,
  });

  return false;
};


// main deal
document.addEventListener('alpine:init', async () => {
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

  Alpine.store("user", {
    async init () {
      console.log("udiuehdue")
    }
  })

  Alpine.store("messages").fetchAll()
})


//write message
document.querySelector("#writeForm").addEventListener("submit", async function(event){
  event.preventDefault();

  const btn = event.target.querySelector("#submit-btn");

  const inputText = document.getElementById("formText").value;
  const inputImage = document.getElementById("formImage").files[0];
  const inputVideo = document.getElementById("formVideo").files[0];

  let imageBlob = null
  let videoBlob = null

  const imageFileReader = new FileReader()
  imageFileReader.readAsArrayBuffer(inputImage)
  imageFileReader.addEventListener("loadend", async () => {
    const imageBuffer = [... new Uint8Array(imageFileReader.result)]
    // imageBlob = new Blob([imageBuffer], { type: inputImage.type})

    if (inputVideo) {
      const videoFileReader = new FileReader()
      videoFileReader.readAsArrayBuffer(inputVideo)
      videoFileReader.addEventListener("loadend", async () => {
        const videoBuffer = [...new Uint8Array(videoFileReader.result)]
        // videoBlob = new Blob([videoBuffer], { type: inputVideo.type})

        if (document.getElementById("formText").value.length != 0){
          btn.setAttribute("disabled", true);
          
          // await writeMessage(inputText, imageBlob, videoBlob)
          await writeMessage(inputText, imageBuffer, videoBuffer)
          // await writeMessage(inputText)

          document.getElementById("formText").value = "";
        }

        Alpine.store("messages").fetchAll()
        btn.removeAttribute("disabled");
      })
    }
    // else {
    //   if (document.getElementById("formText").value.length != 0){
    //     btn.setAttribute("disabled", true);
        
    //     await writeMessage(inputText, imageBlob, videoBlob)

    //     document.getElementById("formText").value = "";
    //   }

    //       Alpine.store("messages").fetchAll()
//       btn.removeAttribute("disabled");
//     }
  });
})

async function writeMessage(inputText, imageBlob, videoBlob) {
  
  // const response = await actor.writeMessage({Text:inputText, Image:imageBlob, Video:videoBlob});
  const response = await actor.writeMessage({Text:inputText});

  const message = !!response.err ? response.err : "Created successfully";
  const icon = !!response.err ? "error" : "success";
  swal("Message", message, icon);
}
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
      console.log(response);
      const message = !!response.err ? response.err : "Updated successfully";
      const icon = !!response.err ? "error" : "success";
      swal("Message", message, icon);
      document.getElementById("updateText").value = "";
  }
  Alpine.store("messages").fetchAll()

  btn.removeAttribute("disabled");

});

Alpine.start()