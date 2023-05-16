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

actor {

  public type Content = {
    #Text : Text;
    #Image : Blob;
    #Video : Blob;
  };

  public type Message = {
    vote : Int;
    content : Content;
    creator : Principal;

  };

  type VotePrincipals = {
    voter : Principal;
    voted : Bool;
  };

  type Order = Order.Order;

  var messageId : Nat = 0;

  let wall = HashMap.HashMap<Nat, Message>(0, Nat.equal, Hash.hash);

  let voters = HashMap.HashMap<Principal, VotePrincipals>(0, Principal.equal, Principal.hash);
  stable var preserveWall : [(Nat, Message)] = [];
  stable var preserveVotePrincipals : [(Principal, VotePrincipals)] = [];

  system func preupgrade() {
    preserveWall := Iter.toArray(wall.entries());
    preserveVotePrincipals := Iter.toArray(voters.entries());
  };

  system func postupgrade() {
    for ((id, message) in preserveWall.vals()) {
      wall.put(id, message);
    };

    for ((caller, votes) in preserveVotePrincipals.vals()) {
      voters.put(caller, votes);
    };
  };

// get caller
  public query (message) func greet() : async Text {
    return Principal.toText(message.caller) # "!";
  };

  // Add a new message to the wall
  public shared ({ caller }) func writeMessage(c : Content) : async Nat {
    let message : Message = {
      vote = 0;
      content = c;
      creator = caller;
    };
    let id = messageId;
    wall.put(id, message);
    messageId += 1;
    return id;
  };

  // Get a specific message by ID
  public shared query func getMessage(messageId : Nat) : async Result.Result<Message, Text> {
    let messageSize = wall.size();
    if (messageId < messageSize) {
      switch (wall.get(messageId)) {
        case (?message) {
          return #ok(message);
        };
        case (null) {
          return #err("No message");
        };
      };
    } else {
      return #err("Invalid Message Id " # Nat.toText(messageId));
    };
  };

  // Update the content for a specific message by ID
  public shared ({ caller }) func updateMessage(messageId : Nat, c : Content) : async Result.Result<(), Text> {
    if (messageId > wall.size()) {
      return #err("Invalid Message Id " # Nat.toText(messageId));
    } else {
      switch (wall.get(messageId)) {
        case (?message) {
          if (Principal.equal(message.creator, caller)) {
            let updatedMessage : Message = {
              vote = message.vote;
              content = c;
              creator = message.creator;
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
  public shared func deleteMessage(messageId : Nat) : async Result.Result<(), Text> {
    let messageSize = wall.size();
    if (messageId < messageSize) {
      switch (wall.get(messageId)) {
        case (?message) {
          wall.delete(messageId);
          return #ok();
        };
        case (_) {
          return #err("No message");
        };
      };
    } else {
      return #err("Invalid Message Id " # Nat.toText(messageId));
    };

  };
  // Voting
  public shared ({ caller }) func upVote(messageId : Nat) : async Result.Result<(), Text> {
    if (messageId > wall.size()) {
      return #err("Invalid Message Id " # Nat.toText(messageId));
    } else {
      switch (wall.get(messageId)) {
        case (?message) {
          // let existingVote = voters.get(caller);
          // if (existingVote == null) {
            let updatedMessage : Message = {
              vote = message.vote + 1;
              content = message.content;
              creator = message.creator;
            };
            // let updatedVoter : VotePrincipals = {
            //   voter = caller;
            //   voted = true;
            // };

            // voters.put(caller, updatedVoter);
            let res = wall.put(messageId, updatedMessage);
            return #ok(());
          // } else {
          //   return #err("You have already voted!");
          // };
        };
        case (null) {
          return #err("Message does not exist");
        };
      };
    };

  };

  public shared ({ caller }) func downVote(messageId : Nat) : async Result.Result<(), Text> {
    if (messageId > wall.size()) {
      return #err("Invalid Message Id " # Nat.toText(messageId));
    } else {
      switch (wall.get(messageId)) {
        case (?message) {
          // let existingVote = voters.get(caller);
          // if (existingVote == null) {

            let updatedMessage : Message = {
              vote = message.vote - 1;
              content = message.content;
              creator = message.creator;
            };
            // let updatedVoter : VotePrincipals = {
            //   voter = caller;
            //   voted = false;
            // };

            // voters.put(caller, updatedVoter);
            let res = wall.put(messageId, updatedMessage);
            return #ok();
          // } else {
          //   return #err("You have already voted!");
          // };
        };
        case (null) {
          return #err("Message does not exist");
        };
      };
    };

  };

  //getVoters
  public query func getVoters() : async [VotePrincipals] {
    Iter.toArray<VotePrincipals>(voters.vals());
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
