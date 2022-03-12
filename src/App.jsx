import React, { useEffect, useState } from 'react';
import './App.css';
import { ethers } from 'ethers'; // Library that helps frontend to talk to our contract
import abi from './utils/PeacePortal.json'; // We get the content of that file in the solidity project, under artifacts/contracts/WavePortal.sol/WavePortal.json
import {allPiecesOfPeace} from "./utils/helpers.js"

export default function App() {
  //Variable to store our user's public wallet
  const [currentAccount, setCurrentAccount] = useState('');

  const [moment, setMoment] = useState('morning');

  const [totalPeace, setTotalPeace] = useState(0);

  const [loading, setLoading] = useState(false);

  const [thanks, setThanks] = useState(false);

  const [piecesOfPeace, setPiecesOfPeace] = useState([]);

  const [allPeaceMessages, setAllPeaceMessages] = useState([]);

  const [message, setMessage] = useState('');

  const [error, setError] = useState(null);

  const [youWin, setYouWin] = useState(false);

  //From the contract deploy, we get this address (same as the one used in Etherscan)
  const contractAddress = '0x0757167e430d8cC270aef51f7C698CcDe41f2F6e';

  const contractABI = abi.abi;

  const checkIfWalletIsConnected = async () => {
    try {
      //Make sure we have access to window.ethereum thanks to metamask
      const { ethereum } = window;
      if (!ethereum) {
        console.log('Make sure you have metamask!');
        return;
      } else {
        console.log('We have the ethereum object', ethereum);
      }

      //Check if we are authorized to access the user's wallet
      const accounts = await ethereum.request({ method: 'eth_accounts' });

      if (accounts.length !== 0) {
        const account = accounts[0];
        console.log('Found an authorized account:', account);
        setCurrentAccount(account);
      } else {
        console.log('No authorized account found');
        return;
      }
      await getAllPeaceMessages();
    } catch (error) {
      setError(error.message);
      console.log(error);
    }
  };

 const getTotalPeace = (count = allPeaceMessages.length + 1) => {
        const diff = +count - piecesOfPeace.length;
        let newPiecesOfPeace = [...piecesOfPeace];
        for (let i = 0; i < diff; i++) {
          const randomNb =
            Math.floor(Math.random() * (allPiecesOfPeace.length + 1) + 1) - 2;
          const index = randomNb < 0 ? 0 : randomNb
          newPiecesOfPeace.push(allPiecesOfPeace[index]);
        }
        setPiecesOfPeace(newPiecesOfPeace);
        setTotalPeace(newPiecesOfPeace.length);
  };

  const getAllPeaceMessages = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const peacePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );

        const peaces = await peacePortalContract.getAllWaves();

        const peacesCleaned = peaces.map(p => ({
          address: p.waver,
          timestamp: new Date(p.timestamp * 1000),
          message: p.message
        }));

        getTotalPeace(peacesCleaned.length);

        setAllPeaceMessages(peacesCleaned);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert('Get MetaMask!');
        return;
      }

      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      });

      console.log('Connected', accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
      setError(error.message);
    }
  };

  const checkIfLessThan15Min = () => {
    const currentAccountMessages = allPeaceMessages.filter(m => m.address.toLowerCase() === currentAccount.toLowerCase())
    const tooEarly = currentAccountMessages.find(m => {
      const now = new Date()
      const diffInMS = now - new Date(m.timestamp)
      return diffInMS < 15 * 60 * 1000
    })

    if(tooEarly) {
      setError("Mahatma Gandhi said : 'To lose patience is to lose the battle'...   Please wait 15 min before to send another piece of Peace.")
    } else {
      setError("Something went wrong, please check the transaction in Metamask or Etherscan.")
    }
  }
  
  const sendPeace = async () => {
    setYouWin(false);
    if (!currentAccount) {
      setError('Please connect your wallet first.');
      return;
    }
    if (!message) {
      setError('Please write few kind words you wanna send to the world.');
      return;
    }
  
    try {
      const { ethereum } = window;
  
      if (ethereum) {
        setError(null);
        setLoading(true);
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const peacePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );
        //Execute the actual wave from the smart contract
        const peaceTxn = await peacePortalContract.wave(message, {
          gasLimit: 300000
        });
        console.log('Mining...', peaceTxn.hash);
  
        await peaceTxn.wait();
        console.log('Mined --', peaceTxn.hash);
  
        await getAllPeaceMessages();
      } else {
        console.log("Ethereum object doesn't exist!");
        setError('Please connect your wallet first.');
      }
      setMessage('');
      setLoading(false);
      setThanks(true);
      setTimeout(() => {
        setThanks(false);
      }, 11000);
    } catch (error) {
      console.log('Error on send peace', error );
      checkIfLessThan15Min();
      setLoading(false);
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  useEffect(() => {
    let peacePortalContract;

    const onNewPeace = (from, timestamp, message) => {
      console.log('New Wave', from, timestamp, message);
      if(from.toLowerCase() !== currentAccount.toLowerCase()){
      setAllPeaceMessages(prevState => [
        ...prevState,
        { address: from, timestamp: new Date(timestamp * 1000), message }
      ]);}
      getTotalPeace(totalPeace + 1)
    };

    const onNewWinner = (winner) => {
      console.log('New Winner!', winner)
      console.log('currentAccount', currentAccount)
      if(winner.toLowerCase() === currentAccount.toLowerCase()) {
        setYouWin(true)
      }
    }

    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      peacePortalContract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      peacePortalContract.on('NewWave', onNewPeace);
      peacePortalContract.on('NewWinner', onNewWinner);
    }

    return () => {
      if (peacePortalContract) {
        peacePortalContract.off('NewWave', onNewPeace);
        peacePortalContract.off('NewWinner', onNewWinner);
      }
    };
  }, []);

  useEffect(() => {
    const now = new Date();
    const hours = now.getHours();
    const message =
      hours < 12 ? 'morning' : hours < 18 ? 'afternoon' : 'evening';
    setMoment(message);
  }, []);

  return (
    <div className='mainContainer'>
      <div className='dataContainer'>
        <div className='header'>☀️ Good {moment}! 🌿🌸</div>

        <div className='bio'>
          Let's spread some love all around the blockchain! <br />
          Please share with us few kind words that inspires you, helps you in
          your everyday life or that you just wanna give to the world.
        </div>

        <div className='scrollingPart'>
          <div className='messageSpace'>
            <label>Your message to the world</label>
            <input value={message} onChange={e => setMessage(e.target.value)} />
          </div>

          {!!error && <div className='bio error'>{error}</div>}

          {loading ? (
            <div className='loadingButton'>
              <div className='lds-heart'>
                <div></div>
              </div>
              <div className='loadingText'> Spreading your peace...</div>
              <div className='lds-heart'>
                <div></div>
              </div>
            </div>
          ) : (
            <button className='waveButton' onClick={sendPeace}>
              🙏 Share some peace 🙏
            </button>
          )}

          {!currentAccount && (
            <button
              className='waveButton connectButton'
              onClick={connectWallet}
            >
              👉 Connect your Wallet 👈
            </button>
          )}

          {thanks && !youWin && (
            <div className='thankYou'>
              🙏 Thank you for your contribution 🙏 <br />
              <span>
                It just get transformed into a nice emoji down there, in our
                Peace Emoji Chain.<br /> 
                You can also see your message into the Peace Thread.
              </span>
            </div>
          )}

          { youWin && (
            <div className="youWin">
              <h5>🥳 Congratulations! 🎉 </h5>
              Thanks to your piece of Peace, you just earned <span className="winAmount">0.0001 ETH</span>.<br />
              <span className="quote">"Earn Nicely, spend wisely and you will live happily." - Auliq Ice</span>
              A nice emoji has been added down there, in our
                Peace Emoji Chain.<br /> 
                You can also see your message into the Peace Thread. <br/>
            </div>
          )}

          <div className='flowers' style={thanks ? { marginTop: 24 } : {}}>
            {Array.from(Array(totalPeace).keys()).map((p, i) => (
              <div key={i}>
                {
                  piecesOfPeace[
                    i < piecesOfPeace.length ? i : i % piecesOfPeace.length
                  ]
                }
              </div>
            ))}
          </div>

          {!!totalPeace && (
            <div className='counter'>
              Already{' '}
              <span>
                {totalPeace} piece{totalPeace > 1 ? 's' : ''} of Peace
              </span>{' '}
              {totalPeace > 1 ? 'have' : 'has'} been shared.
            </div>
          )}

          {!!allPeaceMessages.length && (
            <div className='allMessages'>
              <h3>🙏 Peace thread ✨</h3>
              {allPeaceMessages
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((peace, i) => (
                  <div className='peaceMessage' key={i}>
                    <div className='time'>
                      {' '}
                      {peace.timestamp.toLocaleString()}
                    </div>
                    <div className='message'>{peace.message}</div>
                    <div className='sender'>
                      Sent by{' '}
                      <a
                        href={`https://rinkeby.etherscan.io/address/${peace.address}`}
                        target='_blank'
                        className='linkToSender'
                      >
                        {peace.address}
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
