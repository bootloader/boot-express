function onSessionStart() {
  console.log("=======================TEST====onSessionStart===");
}

function onSessionRouted() {
  console.log("=======================TEST====onSessionRouted===");
}

async function  onMessageReceive() {
  //console.log("Recieved Message:", $.inbound);
  let resp = await $.reply({
      text: `ResponseOfSanta(${$.inbound.getText()})`,
      options : ["Enter Cicle","Create Circle"]
  })
  console.log("Response:", resp);
}
