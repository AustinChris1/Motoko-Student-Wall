import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Hash "mo:base/Hash";
import Result "mo:base/Result";
import Blob "mo:base/Blob";
import Iter "mo:base/Iter";
import Order "mo:base/Order";
import Array "mo:base/Array";
import Bool "mo:base/Bool";
import Text "mo:base/Text";

actor {

  public type Content = {
    #Text : Text;
    #Image : Blob;
    #Video : Blob;
  };

  public type Message = {
    messageId : Int;
    vote : Int;
    content : Content;
    creator : Principal;
    voters : [Principal];
  };

  type Order = Order.Order;

  stable var messageId : Nat = 0;

  let wall = HashMap.HashMap<Nat, Message>(0, Nat.equal, Hash.hash);

  stable var preserveWall : [(Nat, Message)] = [];

  system func preupgrade() {
    preserveWall := Iter.toArray(wall.entries());
  };

  system func postupgrade() {
    for ((id, message) in preserveWall.vals()) {
      wall.put(id, message);
    };
  };

  // get caller
  public query (message) func greet() : async Text {
    return Principal.toText(message.caller);
  };

  // Add a new message to the wall
  public shared ({ caller }) func writeMessage(c : Content) : async Result.Result<(), Text> {
    if (Principal.isAnonymous(caller)) {
      return #err("Please login!");
    } else {
      messageId += 1;
      let id = messageId;
      let message : Message = {
        messageId = id;
        vote = 0;
        content = c;
        creator = caller;
        voters = [];
      };
      wall.put(id, message);
      return #ok();
    };
  };

  // Get a specific message by ID
  public shared query ({ caller }) func getMessage(messageId : Nat) : async Result.Result<Message, Text> {
    let messageSize = wall.size();
    // if (messageId < messageSize) {
    switch (wall.get(messageId)) {
      case (?message) {
        return #ok(message);
      };
      case (null) {
        return #err("No message");
      };
    };
    // } else {
    //   return #err("Invalid Message Id " # Nat.toText(messageId));
    // };
  };

  // Update the content for a specific message by ID
  public shared ({ caller }) func updateMessage(messageId : Nat, c : Content) : async Result.Result<(), Text> {
    if (Principal.isAnonymous(caller)) {
      return #err("Please login!");
    } else {
      switch (wall.get(messageId)) {
        case (?message) {
          if (Principal.equal(message.creator, caller)) {
            let updatedMessage : Message = {
              messageId = message.messageId;
              vote = message.vote;
              content = c;
              creator = message.creator;
              voters = message.voters;
            };
            let res = wall.put(messageId, updatedMessage);
            return #ok(());
          } else {
            #err("Only message creator can update message");
          };
        };
        case (null) {
          return #err("Message does not exist");
        };
      };
    };
  };

  //Delete a specific message by ID
  public shared ({ caller }) func deleteMessage(messageId : Nat) : async Result.Result<(), Text> {
    if (Principal.isAnonymous(caller)) {
      return #err("Please login!");
    } else {
      switch (wall.get(messageId)) {
        case (?message) {
          if (Principal.equal(message.creator, caller)) {

            wall.delete(messageId);
            return #ok();
          } else {
            #err("Only message creator can delete message");
          };

        };
        case (_) {
          return #err("No message");
        };
      };
    };
  };

  // Voting
  public shared ({ caller }) func upVote(messageId : Nat) : async Result.Result<(), Text> {
    if (Principal.isAnonymous(caller)) {
      return #err("Please login!");
    } else {
      switch (wall.get(messageId)) {
        case (?message) {
          var existingVote : Text = "";
          for (element in message.voters.vals()) {
            if (element == caller) {
              existingVote := Principal.toText(element);
            };
          };
          if (existingVote == "") {
            let updatedVoters = Array.append(message.voters, [caller]);
            let updatedMessage : Message = {
              messageId = message.messageId;
              vote = message.vote + 1;
              content = message.content;
              creator = message.creator;
              voters = updatedVoters;
            };
            wall.put(messageId, updatedMessage);
            return #ok();
          } else {
            return #err("You have already voted!");
          };

        };
        case (null) {
          return #err("Message does not exist");
        };
      };
    };
  };

  //downVote
  public shared ({ caller }) func downVote(messageId : Nat) : async Result.Result<(), Text> {
    if (Principal.isAnonymous(caller)) {
      return #err("Please login!");
    } else {
      switch (wall.get(messageId)) {
        case (?message) {
          var existingVote : Text = "";
          for (element in message.voters.vals()) {
            if (element == caller) {
              existingVote := Principal.toText(element);
            };
          };
          if (existingVote == "") {
            let updatedVoters = Array.append(message.voters, [caller]);
            let updatedMessage : Message = {
              messageId = message.messageId;
              vote = message.vote - 1;
              content = message.content;
              creator = message.creator;
              voters = updatedVoters;
            };
            wall.put(messageId, updatedMessage);
            return #ok();
          } else {
            return #err("You have already voted!");
          };

        };
        case (null) {
          return #err("Message does not exist");
        };
      };
    };
  };

  //getAllmessages
  public query func getAllMessages() : async [Message] {
    Iter.toArray<Message>(wall.vals());
  };

  //getAllMessageRanked
  private func compareMessage(x : Message, y : Message) : Order {
    if (x.vote == y.vote) {
      return #equal;
    };
    if (x.vote > y.vote) {
      return #less;
    };
    return #greater;

  };

  public query func getAllMessagesRanked() : async [Message] {
    let array : [Message] = Iter.toArray(wall.vals());
    return Array.sort<Message>(array, compareMessage);
  };
};
