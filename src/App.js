import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useState } from 'react';
import { useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy as style } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useLayoutEffect, useRef} from 'react';


function App() {
  const [query, setQuery] = useState("input");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [file, setFile] = useState(null);
  const [questionText, setQuestionText] = useState("");
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [related, setRelated] = useState("");
  let response;
  if (query == 'input' && !loading) {
    response = <Init setQuery = {setQuery} setInputText = {setInputText} inputText = {inputText} setOutputText = {setOutputText} setFile = {setFile} file={file} setLoading = {setLoading} setRelated = {setRelated}/>;
  }
  else if (loading) {
    response = <Loading />;
  }
  else {
  response = <Final questionAnswer = {questionAnswer} setQuestionAnswer = {setQuestionAnswer} outputText = {outputText} setQuestionText = {setQuestionText} inputText = {inputText} setOutputText = {setQuestionAnswer} questionText = {questionText} setLoading = {setLoading} related = {related}/>;
  }
  return (
    <div className="App">
      <div className = "wave"></div>
      <div className = "wave"></div>
      {response}
      <div className = "wave"></div>
    </div>
  );
}

function Init({setQuery, setInputText, inputText, setOutputText, setFile, file, setLoading, setRelated}) {
  return (
    <>
      <Context />
      <TextInput setInputText = {setInputText}/>
      <PdfInput setFile = {setFile} />
      <Go setQuery = {setQuery} inputText = {inputText} setOutputText = {setOutputText} file = {file} setInputText = {setInputText} setFile = {setFile} setLoading = {setLoading} setRelated = {setRelated}/>
    </>
  )
}

function Final({ outputText, setQuestionText, inputText, questionAnswer, questionText, setQuestionAnswer, setLoading, related}) {
  return (
    <>
      <Output outputText = {outputText}/>
      <Related related = {related} />
      <Question setQuestionText = {setQuestionText}/>
      <Ask inputText = {inputText} setQuestionAnswer = {setQuestionAnswer} questionText = {questionText} setLoading = {setLoading}/>
      <Answer outputText = {questionAnswer} />
      <Back />
    </>

  )
}

function Context() {
  return (
    <div className = "top-container">
      <img src='site_logo.png' className = "site-logo" />
      <div className = "card-big">
        <h1 className = "prod-name">iQuery</h1>
      </div>
      <div className = "card-small">
        <p className = "card-small-contents">Got a research paper you don't want to read? Missed out on assigned reading material from class? Look no further - we've got just the thing for you. Simply paste your reading material below to get started.</p>
      </div>
    </div>
  )
}

function TextInput({setInputText}) {
  const textbox = useRef(null);
  function adjustHeight() {
    textbox.current.style.height = "inherit";
    textbox.current.style.height = `${Math.min(textbox.current.scrollHeight, 350)}px`;
  }
  function handleKeyDown(e) {
    adjustHeight();
    console.log(e.target.value);
    setInputText(e.target.value);
  }

  return (
    <div className = "inp-ctr">
       <div className ="text-input-container">
        <textarea ref = {textbox} onChange = {handleKeyDown} class="form-control-lg" id="exampleFormControlTextarea1" placeholder="Paste your reading material here..."></textarea>
      </div>
    </div>
  )
}

function PdfInput({setFile}) {
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  return (
    <div className = "pdf-input">
      <h2>Or upload a PDF</h2>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
    </div>
  );
}

function Go({setQuery, inputText, setOutputText, file, setFile, setInputText, setLoading, setRelated}) {

  const fetchData = async (text) => {
    try {
      setLoading(true);
      const response = await axios.post("http://localhost:5050/summarize", { input: { text: text } }); 
      setOutputText(response.data.result);
      setRelated(response.data.related);
    } catch (error) {
      setOutputText("Error fetching data");
      console.error("Error fetching data:", error);
    } 
  };

  async function onClick() {
    setLoading(true);
    try {
      if (inputText.length > 0) {
        await fetchData(inputText);
      } else {
        await handleSubmit();
        setFile(null);
      }
      setQuery('output');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      setLoading(true);
      const response = await axios.post('http://localhost:5050/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setOutputText(response.data.response);
      setInputText(response.data.context);
      setRelated(response.data.related);
    } catch (error) {
      console.error('Error uploading file:', error);
    } 
};


  return (
    <div className = "go-button">
      <button type="button" className="btn btn-primary btn-lg" onClick = {onClick}>Let's Go
      </button>
    </div>

  );
}

function Back() {
  function onClick() {
    window.location.reload();
  }
  return (
    <div className = "go-button">
      <button type="button" className="btn btn-primary btn-lg" onClick = {onClick}>Back
      </button>
    </div>
  );
}

function Ask({ inputText, setQuestionAnswer, questionText, setLoading}) {

  const fetchData = async (text, question) => {
    try {
      setLoading(true);
      const response = await axios.post("http://localhost:5050/question", { input: { context: text, question: question } }); 
      setQuestionAnswer(response.data);
    } catch (error) {
      setQuestionAnswer("Error fetching data");
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  async function onClick() {
    const temp = await fetchData(inputText, questionText);
  }

  return (
    <div className = "ask-button">
      <button type="button" className="btn btn-dark" onClick = {onClick}>Ask ahead
      </button>
    </div>

  );
}


function Question({setQuestionText}) {
  const textbox = useRef(null);
  function adjustHeight() {
    textbox.current.style.height = "inherit";
    textbox.current.style.height = `${Math.min(textbox.current.scrollHeight, 150)}px`;
  }
  function handleKeyDown(e) {
    adjustHeight();
    setQuestionText(e.target.value);
  }
  return (
    <>
      <h1 className = 'summary-header'>Still confused?</h1>
      <div className ="text-input-container">
        <textarea ref = {textbox} onChange = {handleKeyDown} className ="form-control-lg add-qn" id="exampleFormControlTextarea1" placeholder="Ask all your burning questions here..."></textarea>
      </div>
    </>
  );
}

function Answer({outputText}) {
  if (outputText) {
    return (
      <>
      <div className="summary-card-small">
        <div className="summary-card-small-contents" dangerouslySetInnerHTML={{ __html: outputText }} />
      </div>
    </>
    );
  }
}

function Output({ outputText }) {
  return (
    <>
      <h1 className="summary-header">Summary: </h1>
      <div className="summary-card-small">
        <div className="summary-card-small-contents" dangerouslySetInnerHTML={{ __html: outputText }} />
      </div>
    </>
  );
}

function Related({related}) {
  return (
    <>
      <h1 className="summary-header">Related: </h1>
      <div className="summary-card-small-related">
        <div className="summary-card-small-contents" dangerouslySetInnerHTML={{ __html: related }} />
      </div>
    </>
  );
}


function Loading() { 
  return (
    <div className="loading-container">
      <Spinner animation="border text-primary" role="status" className = "spin-wheel">
      </Spinner>
      <p>Please wait, your query is being processed...</p>
    </div>
  );
}


export default App;
