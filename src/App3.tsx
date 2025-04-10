import { useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid';
import { useWebSocket } from './hooks/useWebSocket';
import { Button, Form, InputGroup, ListGroup } from 'react-bootstrap';

interface Message {
  id: string;
  content: string;
  sender?: string; // 이 메세지를 누가 보냈는지 정보로 Message 객체에 담기 위해
}



function App3() {

  const [msgs, setMsgs] = useState<Message[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  //대화방에 입장한 userName 도 상태값으로 관리하기
  const [userName, setUserName] = useState<string>();
  // userName 을 userRef()를 이용해서 관리하기 ??? 실시간으로 반영 관리를 하기위해서
  const userNameRef = useRef<string|null>(null);
  //대화방 참여자 목록도 상태값으로 관리
  const [userList, setUserList] = useState<string[]>([]);

  // useWebSocket() hook 사용해서 웹소켓 연결하기 
  const { sendMessage, connected } = useWebSocket("ws://192.168.0.107:9000/ws", {
    onOpen: () => {
      console.log("연결됨!");
    },
    onMessage: (event) => {
      //응답된 json 문자열을 실제 object로 변경한다.
      // event.data 은 type, payload
      const received = JSON.parse(event.data);
      if (received.type === "enter") {
        setIsEnter(true);
        setMsgs(prevState => {
          const msg = received.payload.userName + " 님이 입장했습니다.";
          return [...prevState, { id: uuid(), content: msg }]
        });
        //사용자 목록을 update 한다.
        setUserList(received.payload.userList);
      } else if (received.type == "leave") {
        const msg = received.payload.userName + " 님이 퇴장했습니다.";
        setMsgs(prevState => [...prevState, { id: uuid(), content: msg }]);
        //leave 된 userName 을 userList 에서 제거한다
        setUserList(prevState => prevState.filter(item => item !== received.payload.userName))
      } else if (received.type === "public") {
        setMsgs(prevState => {
          //출력할 메세지를 구성한다.
          const msg = received.payload.text;
          return [...prevState, { id: uuid(), content: msg, sender: received.payload.userName }];
        });
      }else if(received.type === "whisper"){
        // 여기가 실행되는 경우는 귓말을 보낸 사람과, 받는 사람이다. ???
        // 
        const msg = received.payload.userName === userNameRef.current ? 
          `${received.payload.text} => [귓말] ${received.payload.toUserName}`
        :
          `[귓말] =>  ${received.payload.text}`
        ;
        setMsgs(prevState=>[...prevState, {id:uuid(), content: msg, sender:received.payload.userName}]);
      }
    },
    onClose: () => {
      console.log("연결끊김!");
    }
  });

  // 메세지 보내는 함수
  const handleSend = () => {
    //입력한 메세지 읽어와서
    const msg = inputRef.current?.value;
    //서버에 전송할 정보를 담고 있는 object
    let obj = null;
    if(selectedUser){
      obj={
        path:"/chat/whisper",
        data:{
          userName,
          text:msg,
          toUserName:selectedUser
        }
      };
    }else{
      obj={
        path:"/chat/public",
        data:{
          userName,
          text:msg
        }
      };
    }

    //object를 json문자열로 변환해서 전송하기
    sendMessage(JSON.stringify(obj));
    //입력창 초기화
    inputRef.current!.value = "";
  }
  const divStyle = {
    height: "300px",
    backgroundColor: "#cecece",
    padding: "10px",
    overflowY: "auto",
    scrollBehavior: "smooth"
  };
  const divRef = useRef<HTMLDivElement>(null);
  //자동 스크롤
  useEffect(() => {
    if (divRef.current) {
      divRef.current!.scrollTop = divRef.current!.scrollHeight;
    }
  }, [msgs]);

  const bubbleStyleBase: React.CSSProperties = {
    borderRadius: "20px",
    padding: "10px 16px",
    marginBottom: "8px",
    maxWidth: "70%",
    wordBreak: "break-word",
    fontSize: "0.95rem",
    lineHeight: "1.4",
  };
  // 내가 보낸 메세지 스타일
  const myBubbleStyle: React.CSSProperties = {
    ...bubbleStyleBase,
    backgroundColor: "#DCF8C6", // 연한 연두색 (WhatsApp 스타일)
    alignSelf: "flex-end",
    color: "#000",
  };
  // 다른 사람이 보내 메세지 스타일
  const otherBubbleStyle: React.CSSProperties = {
    ...bubbleStyleBase,
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    alignSelf: "flex-start",
    color: "#000",
  };

  //대화방에 입장했는지 여부
  const [isEnter, setIsEnter] = useState<boolean>(false);

  const inputUserRef = useRef<HTMLInputElement>(null);
  const handleEnter = () => {
    const obj = {
      path: "/chat/enter",
      data: {
        userName: inputUserRef.current?.value
      }
    };
    sendMessage(JSON.stringify(obj));
    //userName 을 상태값에 넣어주기
    setUserName(obj.data.userName);
    // userName 을 userNameRef 에도 넣어주기
    userNameRef.current = inputUserRef.current!.value;
  }

  // 메세지를 보낸 사람을 출력할 스타일 
  const senderStyle = {
    fontSize: "0.75rem",
    fontWeight: "bold",
    marginBottom: "2px",
    color: "#555"
  };
  // 입장 , 퇴장 메세지 스타일
  const infoStyle = {
    textAlign: "center",
    margin: "5px 0",
    fontStyle: "italic",
    color: "#888"
  }
  // 귓말 보내기 위해 선택된 username 을 상태값으로 관리
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  return (
    <div className='container'>
      <h1>WebSocket 테스트3</h1>
      <h2>WebSocket {connected ? "✅ 연결됨" : "❌ 끊김"} {userName}</h2>
      {isEnter ?
        <div className='row'>
          <div className="col-8">
            <div style={divStyle} ref={divRef}>
              {msgs.map(item => (
                item.sender ?
                  <div key={item.id} style={{
                    display: "flex",
                    flexDirection: "column", // 자식이 세로 방향으로 쌓임
                    alignItems: item.sender === userName ? "flex-end" : "flex-start", // 좌 우 결정(flexDirection 에 따라서 위아래 좌우인지 결정)
                    marginBottom: "10px"
                  }}>
                    {/* 메세지 분기 */}
                    {item.sender !== userName && <div style={senderStyle}>{item.sender}</div>}
                    <div style={item.sender !== userName ? otherBubbleStyle : myBubbleStyle}>
                      {item.content}
                    </div>
                  </div>
                  :
                  <div key={item.id} style={infoStyle}>
                    {item.content}
                  </div>
              ))}
            </div>
            <InputGroup className="mb-3">
              <Form.Control placeholder={selectedUser ? selectedUser + "님에게 귓말 보내기...": "대화 입력..."}
                ref={inputRef}
                onKeyDown={(e) => {
                  // Enter key 를 눌렀을 때 handleSend() 함수 호출하기
                  if (e.key === "Enter") handleSend();
                }}
              />
              <Button variant="outline-secondary" onClick={handleSend}>Send</Button>
            </InputGroup>

          </div>
          <div className='col-4'>
            <h3>참여자 목록</h3>
            <ListGroup as="ul">
              {userList.map(item =>
                <ListGroup.Item as="li"
                  action style={{ cursor: "pointer" }}
                  active={item === selectedUser}
                  onClick={() => setSelectedUser(item === selectedUser ? null : item)}>
                  {item}
                </ListGroup.Item>)}
            </ListGroup>
          </div>
        </div>
        :
        <>
          <input ref={inputUserRef} type="text" placeholder='UserName 입력...' />
          <button onClick={handleEnter}>입장</button>
        </>
      }
    </div>
  )
}

export default App3