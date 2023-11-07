import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Contract, providers, ethers } from 'ethers';
import Web3Modal from 'web3modal';

import {
    TIPPING_ADDRESS,
    TIPPING_ABI,
    TIP_TOKEN_ABI
} from "../contract";

const Home = () => {

    const CHAIN_ID = 11155111;
    const NETWORK_NAME = "Sepolia";

    const [walletConnected, setWalletConnected] = useState(false);
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null)
    const [loading, setLoading] = useState(false);
    const [contractOwner, setContractOwner] = useState(null);
    const [tipToken, setTipToken] = useState(null);
    const [receiverAddress, setReceiverAddress] = useState(null);
    const [tipAmount, setTipAmount] = useState("");
    const [newTippingToken, setNewTippingToken] = useState(null);
    const [userTokenBalance, setUserTokenBalance] = useState(0);
    const [tokenSymbol, setTokenSymbol] = useState(null);

    const web3ModalRef = useRef();

    // Helper function to fetch a Provider instance from Metamask
    const getProvider = useCallback(async () => {
      const provider = await web3ModalRef.current.connect();
      const web3Provider = new providers.Web3Provider(provider);
      const getSigner = web3Provider.getSigner();

      const { chainId } = await web3Provider.getNetwork();

      setAccount(await getSigner.getAddress());
      setWalletConnected(true)


      if (chainId !== CHAIN_ID) {
      window.alert(`Please switch to the ${NETWORK_NAME} network!`);
          throw new Error(`Please switch to the ${NETWORK_NAME} network`);
      }
      setProvider(web3Provider);
  }, []);

  // Helper function to fetch a Signer instance from Metamask
  const getSigner = useCallback(async () => {
      const web3Modal = await web3ModalRef.current.connect();
      const web3Provider = new providers.Web3Provider(web3Modal);

      const { chainId } = await web3Provider.getNetwork();

      if (chainId !== CHAIN_ID) {
      window.alert(`Please switch to the ${NETWORK_NAME} network!`);
          throw new Error(`Please switch to the ${NETWORK_NAME} network`);
      }
      
      const signer = web3Provider.getSigner();
      return signer;
  }, []);


  const getTippingInstance = useCallback((providerOrSigner) => {
    return new Contract(
        TIPPING_ADDRESS,
        TIPPING_ABI,
        providerOrSigner
    )
  },[]);

  const getTipTokenInstance = useCallback((providerOrSigner, tokenContractAddress) => {
    return new Contract(
        tokenContractAddress,
        TIP_TOKEN_ABI,
        providerOrSigner
    )
  },[]);

  const connectWallet = useCallback(async () => {
    try {
        web3ModalRef.current = new Web3Modal({
            network: NETWORK_NAME,
            providerOptions: {},
            disableInjectedProvider: false,
        });

        await getProvider();
    } catch (error) {
        console.error(error);
    }
  },[getProvider]);


  const sendTip = async (e) => {
    e.preventDefault();

    if(receiverAddress === "" || tipAmount === "" || tipAmount === 0){
      alert("Please input receiver address and amount greater than zero");
    } else if(parseInt(userTokenBalance) < parseInt(tipAmount)) {
      alert("You don't have enough token to send as tip!");
    } else {
      try {
        const tipAmountInWei = ethers.utils.parseEther(tipAmount);

        const signer = await getSigner();

        const tipTokenContract = getTipTokenInstance(signer, tipToken);
        const approveTxn = await tipTokenContract.approve(TIPPING_ADDRESS, tipAmountInWei);

        setLoading(true);

        await approveTxn.wait();
  
        const tippingContract = getTippingInstance(signer);
        const txn = await tippingContract.sendTips(tipAmountInWei, receiverAddress);
        await txn.wait();

        setLoading(false);
      } catch (error) {
        console.error(error);
      }
    }
  }

  const changeTipToken = async (e) => {
    e.preventDefault();

    if(newTippingToken === null){
      alert("Input the new tipping token address");
    } else {
      try {
        const signer = await getSigner();
        const tippingContract = getTippingInstance(signer);
        const txn = await tippingContract.changeTipToken(newTippingToken);

        setLoading(true);
        await txn.wait();
        setLoading(false);

      } catch (error) {
        console.error(error);
      }
    }
  }

  useEffect(() => {
    const fetchTokenDetails = async () => {
      if(account && provider && tipToken) {
        try {
          const tipTokenContract = getTipTokenInstance(provider, tipToken);
          const userTokenBalance = await tipTokenContract.balanceOf(account);
          const tokenSymbol = await tipTokenContract.symbol();

          setUserTokenBalance(ethers.utils.formatEther(userTokenBalance));
          setTokenSymbol(tokenSymbol);
        } catch (error) {
          console.error(error);
        }
      }
    }

    fetchTokenDetails();
  }, [account, provider, tipToken]);

  // eslint-disable-next-line
  useEffect(() => {
    const fetchTippingDetail = async () => {
      if(account && provider){
        try {
          const tippingContract = getTippingInstance(provider);
          const contractTipToken = await tippingContract.tipToken();
          const owner = await tippingContract.owner();

          setTipToken(contractTipToken);
          setContractOwner(owner);
        } catch (error) {
          console.error(error);
        }
      }
    }

    fetchTippingDetail()
  }, [account, provider]);

  useEffect(() => {
    if(!walletConnected) {
        connectWallet();
    }
  }, [walletConnected, connectWallet]);

  return (
    <Fragment>
      <div className="container mb-5">
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
          <a className="navbar-brand" href="!#">
            Tipping dApp
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-toggle="collapse"
            data-target="#navbarText"
            aria-controls="navbarText"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarText">
            <ul className="navbar-nav mr-auto">
              
            </ul>
            
            <span className="navbar-text">
              {!walletConnected ? <button className="btn btn-danger" onClick={connectWallet}>Connect Wallet</button> : <button className="btn btn-dark" disabled>{account !== null ? account : "Connected"}</button>}
            </span>

            <span className="navbar-text">
              {walletConnected && <button className="btn btn-primary" disabled>{userTokenBalance} {tokenSymbol}</button>}
            </span>
          </div>
        </nav>
      </div>

      <div className="row">
        <div className="col-md-3"></div>

        <div className="col-md-6 mt-5">
            <h3>Send tips to your loved ones</h3>
            <form>
                <div className="form-group">
                    <label htmlFor="receiver">Receiver's Address</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Receiver Address"
                      onChange={(e) => setReceiverAddress(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="target">Tip Amount</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="Amount"
                      onChange={(e) => setTipAmount(e.target.value)}
                    />
                </div>

                <button className={loading ? "btn btn-secondary btn-block" : "btn btn-dark btn-block"} disabled={loading ? "disabled" : ""} onClick={sendTip}>{loading ? "Processing" : "Send Tip"}</button>
            </form>

            {account !== null && contractOwner !== null && account === contractOwner && 
              <form className="mt-5">
                <div className="form-group">
                    <label htmlFor="receiver">New Tipping Token</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Tipping Token"
                      onChange={(e) => setNewTippingToken(e.target.value)}
                    />
                </div>
                <button className={loading ? "btn btn-secondary btn-block mt-3" : "btn btn-info btn-block mt-3"} disabled={loading ? "disabled" : ""} onClick={changeTipToken}>{loading ? "Processing" : "Change Tipping Token"}</button>
              </form>
            }
        </div>

        <div className="col-md-3"></div>
      </div>
    </Fragment>
  );
};

export default Home;
