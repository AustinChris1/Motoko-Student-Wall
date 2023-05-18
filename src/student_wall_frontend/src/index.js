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
  const principal = Alpine.store("user").principal

  greetButton.removeAttribute("disabled");
  swal("Your Principal ID is", principal);
  // document.getElementById("greeting").innerText = greeting;

  return false;
};

// const loginButton = document.getElementById("login");
// loginButton.onclick = async (e) => {
//   e.preventDefault();

//   // create an auth client
//   let authClient = await AuthClient.create();

//   // start the login process and wait for it to finish
//   await new Promise((resolve) => {
//     authClient.login({
//       identityProvider: process.env.II_URL,
//       onSuccess: resolve,
//     });
//   });
//   // At this point we're authenticated, and we can get the identity from the auth client:
//   const identity = authClient.getIdentity();

//   // Using the identity obtained from the auth client, we can create an agent to interact with the IC.
//   const agent = new HttpAgent({ identity });

//   // Using the interface description of our webapp, we create an actor that we use to call the service methods.
//   actor = createActor(process.env.STUDENT_WALL_BACKEND_CANISTER_ID, {
//     agent,
//   });

//   return false;
// };

// const authClient = await AuthClient.create();
// if(authClient.isAuthenticated){
//   loginButton.innerText="Logout";
//   loginButton.onclick = async (e) => {
//     e.preventDefault();
//     authClient.logout();
//   }

// }

// main deal
Alpine.store("user", {
  isLoggedIn: false,
  principal: "",
  setIdentity(principal, isLoggedIn) {
    this.principal = principal
    this.isLoggedIn = isLoggedIn
  },
  removeIdentity(principal) {
    this.principal = principal
    this.isLoggedIn = false
  }
})

Alpine.store('events', {
  async upVote(msgId) {
    const response = await actor.upVote(msgId);
    Alpine.store("messages").fetchAll()
    const message = !!response.err ? response.err : "Upvoted successfully";
    const icon = !!response.err ? "error" : "success";
    swal("Message", message, icon);
    console.log(response);
  },
  async downVote(msgId) {
    const response = await actor.downVote(msgId);
    Alpine.store("messages").fetchAll()
    const message = !!response.err ? response.err : "Downvoted successfully";
    const icon = !!response.err ? "error" : "success";
    await swal("Message", message, icon);
    console.log(response);
  },
  async updateMessage(messageId, text) {
    const response = await actor.updateMessage(messageId, { Text: text });

    console.log(response);
    const message = !!response.err ? response.err : "Updated successfully";
    const icon = !!response.err ? "error" : "success";
    await swal("Message", message, icon);
  },
  async deleteMessage(msgId) {
    const response = await actor.deleteMessage(msgId);
    Alpine.store("messages").fetchAll()
    const message = !!response.err ? response.err : "Deleted successfully";
    const icon = !!response.err ? "error" : "success";
    await swal("Message", message, icon);
    console.log(response);
  },
  async login() {
    // e.preventDefault();
  const authClient = await AuthClient.create({
    keyType: "Ed25519"
  });


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

    Alpine.store("user").setIdentity(identity.getPrincipal().toString(), await authClient.isAuthenticated())
  },
  async logout() {
    const authClient = await AuthClient.create({
      keyType: "Ed25519"
    });

    await authClient.logout();

    const identity = authClient.getIdentity();

   const agent = new HttpAgent({ identity });

    actor = createActor(process.env.STUDENT_WALL_BACKEND_CANISTER_ID, {
      agent,
    });
    
    const principal = await actor.greet()
    Alpine.store("user").removeIdentity(principal)
  }
})

Alpine.store('messages', {
  messages: [],
  add(message) {
    if (this.messages.find(_message => _message.messageId === message.messageId))
      return
    this.messages.push(message)
  },
  async fetchAll() {
    this.messages.splice(0, this.messages.length)

    const response = await actor.getAllMessagesRanked();
    console.log(response)
    for (const message of response)
      this.add(message)
  }
})

document.addEventListener('alpine:init', async () => {
  const authClient = await AuthClient.create({
    keyType: "Ed25519"
  });

  await authClient.logout();

  const identity = authClient.getIdentity();

  Alpine.store("messages").fetchAll()
  Alpine.store("user").setIdentity(identity.getPrincipal().toString(), await authClient.isAuthenticated())
})


//write message
document.querySelector("#writeForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const btn = event.target.querySelector("#submit-btn");

  const inputText = document.getElementById("formText").value;
  // const inputImage = document.getElementById("formImage").files[0];
  // const inputVideo = document.getElementById("formVideo").files[0];

  // let imageBlob = null
  // let videoBlob = null

  // const imageFileReader = new FileReader()
  // imageFileReader.readAsArrayBuffer(inputImage)
  // imageFileReader.addEventListener("loadend", async () => {
  //   const imageBuffer = [... new Uint8Array(imageFileReader.result)]
  //   imageBlob = new Blob([imageBuffer], { type: inputImage.type })

  //   if (inputVideo) {
  //     const videoFileReader = new FileReader()
  //     videoFileReader.readAsArrayBuffer(inputVideo)
  //     videoFileReader.addEventListener("loadend", async () => {
  //       const videoBuffer = [...new Uint8Array(videoFileReader.result)]
  //       // videoBlob = new Blob([videoBuffer], { type: inputVideo.type})

  if (document.getElementById("formText").value.length != 0) {
    btn.setAttribute("disabled", true);

    // await writeMessage(inputText, imageBlob, videoBlob)
    // await writeMessage(inputText, imageBuffer, videoBuffer)
    await writeMessage(inputText)

    document.getElementById("formText").value = "";
  }

  Alpine.store("messages").fetchAll()
  btn.removeAttribute("disabled");
})
// }


//write message
async function writeMessage(inputText) {

  // const response = await actor.writeMessage({Text:inputText, Image:imageBlob, Video:videoBlob});
  const response = await actor.writeMessage({ Text: inputText });

  const message = !!response.err ? response.err : "Created successfully";
  const icon = !!response.err ? "error" : "success";
  swal("Message", message, icon);
}

//update message
document.querySelector("#updateForm")?.addEventListener("submit", async function (event) {
  event.preventDefault();

  const btn = event.target.querySelector("#update-btn");

  const id = parseInt(document.getElementById("updateVal").value);
  const inputText = document.getElementById("updateText").value;


  if (document.getElementById("updateText").value.length != 0) {
    btn.setAttribute("disabled", true);
    // const response = await actor.updateMessage({messageId : id , Text: inputText});
    const response = await actor.updateMessage(id, { Text: inputText });
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