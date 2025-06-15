import { useState, useEffect } from "react";

import { createChatRoom } from "../../services/ChatService";
import Contact from "./Contact";
import UserLayout from "../layouts/UserLayout";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function AllUsers({
  users,          // Expect this to be an array (or default to [] in parent)
  chatRooms,      // Expect this to be an array (or default to [] in parent)
  setChatRooms,
  onlineUsersId,  // Expect this to be an array (or default to [] in parent)
  currentUser,    // Expect this to be an object with 'uid' or null/undefined initially
  changeChat,
}) {
  const [selectedChat, setSelectedChat] = useState(undefined); // undefined is fine for selected index
  const [nonContacts, setNonContacts] = useState([]);      // Initialize as empty array
  const [contactIds, setContactIds] = useState([]);        // Initialize as empty array

  useEffect(() => {
    // Ensure chatRooms and currentUser.uid are available before mapping
    if (Array.isArray(chatRooms) && currentUser?.uid) {
      const Ids = chatRooms.map((chatRoom) => {
        // Ensure chatRoom.members is also an array
        return Array.isArray(chatRoom?.members)
          ? chatRoom.members.find((member) => member !== currentUser.uid)
          : undefined;
      }).filter(Boolean); // Filter out any undefined results if members weren't there
      setContactIds(Ids);
    } else {
      setContactIds([]); // Default if prerequisites not met
    }
  }, [chatRooms, currentUser?.uid]);

  useEffect(() => {
    // Ensure users, contactIds, and currentUser.uid are available
    if (Array.isArray(users) && Array.isArray(contactIds) && currentUser?.uid) {
      setNonContacts(
        users.filter(
          (f) => f.uid !== currentUser.uid && !contactIds.includes(f.uid)
        )
      );
    } else {
      setNonContacts([]); // Default if prerequisites not met
    }
  }, [contactIds, users, currentUser?.uid]);

  const changeCurrentChat = (index, chat) => {
    setSelectedChat(index);
    changeChat(chat);
  };

  const handleNewChatRoom = async (user) => {
    if (!currentUser?.uid || !user?.uid) {
      console.error("Cannot create chat room: current user or target user is undefined.");
      return;
    }
    const members = {
      senderId: currentUser.uid,
      receiverId: user.uid,
    };
    try {
      const res = await createChatRoom(members);
      if (res) { // Check if response is valid
        setChatRooms((prev) => [...prev, res]); // Ensure prev is always an array
        changeChat(res);
      }
    } catch (error) {
      console.error("Error creating chat room:", error);
    }
  };

  // If currentUser isn't loaded yet, maybe show a loading state or return null
  if (!currentUser?.uid) {
    return <p className="p-4">Loading user data...</p>; // Or null, or a spinner
  }

  return (
    <>
      <ul className="overflow-auto h-[30rem]"> {/* Consider max-h- instead of fixed h- for responsiveness */}
        <h2 className="my-2 mb-2 ml-2 text-gray-900 dark:text-white">Chats</h2>
        <li>
          {Array.isArray(chatRooms) && chatRooms.length > 0 ? (
            chatRooms.map((chatRoom, index) => (
              <div
                key={chatRoom?.id || index} // Prefer a stable ID from chatRoom if available
                className={classNames(
                  index === selectedChat
                    ? "bg-gray-100 dark:bg-gray-700"
                    : "transition duration-150 ease-in-out cursor-pointer bg-white border-b border-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-700",
                  "flex items-center px-3 py-2 text-sm "
                )}
                onClick={() => changeCurrentChat(index, chatRoom)}
              >
                <Contact
                  chatRoom={chatRoom}
                  onlineUsersId={onlineUsersId || []} // Pass empty array if undefined
                  currentUser={currentUser}
                />
              </div>
            ))
          ) : (
            <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">No active chats.</p>
          )}
        </li>
        <h2 className="my-2 mb-2 ml-2 text-gray-900 dark:text-white">
          Other Users
        </h2>
        <li>
          {Array.isArray(nonContacts) && nonContacts.length > 0 ? (
            nonContacts.map((nonContact) => ( // Use nonContact.uid for key if available
              <div
                key={nonContact?.uid}
                className="flex items-center px-3 py-2 text-sm bg-white border-b border-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleNewChatRoom(nonContact)}
              >
                <UserLayout user={nonContact} onlineUsersId={onlineUsersId || []} />
              </div>
            ))
          ) : (
            <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">No other users to display.</p>
          )}
        </li>
      </ul>
    </>
  );
}