const USUAL_TOKEN_ABI = [
  {"constant": true, "inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"constant": true, "inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
];

const version = "v0.0.4";

let rpc_url = ""
let wallet_address = "";
let private_key = "";
let token_address = "";
let to_address = "";
let gas_price_of_input = "";
let web3;
let turned_on_switch = false;
let executing = false;
let status_messages = [];

window.onload = function() {
  update_user_data_from_input();
  document.getElementById('version').innerText = version;
  setInterval(transfer_if_needed, 1000);
}

function update_user_data_from_input() {
  wallet_address = document.getElementById('wallet_address').value;
  // token_address = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"; // テスト用に DAI のアドレス
  token_address = document.getElementById('token_address').value;
  to_address = document.getElementById('to_address').value;
  private_key = document.getElementById('private_key').value;
  rpc_url = document.getElementById('rpc_url').value;
  gas_price_of_input = document.getElementById('gas_price').value;
  web3 = new Web3(new Web3.providers.HttpProvider(rpc_url));
}

function filled_inputs() {
  return wallet_address && token_address && to_address && private_key && rpc_url;
}

function get_contract_of(address) {
  const token_abi = USUAL_TOKEN_ABI;
  const contract = new web3.eth.Contract(token_abi, address);
  return contract;
}

async function get_balance_of() {
  const contract = get_contract_of(token_address);
  const balance = await contract.methods.balanceOf(wallet_address).call();
  return balance;
}

async function transfer_token(to_address, amount) {
  const contract = get_contract_of(token_address);
  const data = await contract.methods.transfer(to_address, amount).encodeABI();
  let tx = await get_tx_of(data);
  const gas = await web3.eth.estimateGas(tx);
  tx['gas'] = gas;
  const tx_hash = await send_signed_tx(tx);
  update_status("TX SUCCEEDED");
  executing = false;
}

async function get_tx_of(data) {
  const nonce = await web3.eth.getTransactionCount(wallet_address);
  let gas_price = await web3.eth.getGasPrice();
  if (gas_price_of_input != "auto" && parseInt(gas_price_of_input) > 0) {
    gas_price = await web3.utils.toWei(String(gas_price_of_input), "gwei");
  }
  const tx = {
    'from': wallet_address,
    'to': token_address,
    'nonce': nonce,
    'value': 0,
    'gas': 0,
    'data': data,
    'gasPrice': gas_price,
  };
  return tx;
}

async function send_signed_tx(tx) {
  const signed_tx = await web3.eth.accounts.signTransaction(tx, private_key);
  const tx_hash = await web3.eth.sendSignedTransaction(signed_tx.rawTransaction);
  console.log(tx_hash);
  update_status('SEND TX:' + tx_hash["transactionHash"]);
  return tx_hash;
}

function toggle_transfer_switch() {
  turned_on_switch = !turned_on_switch;

  update_user_data_from_input();
  if (!filled_inputs()) {
    alert("Please fill all inputs.");
    turned_on_switch = false;
  }

  const button_text = turned_on_switch ? "On" : "Off"
  document.getElementById('toggle_button').innerText = button_text;
  const inputs = document.getElementsByTagName('input');
  if (turned_on_switch) {
    for (const input of inputs) {
      input.setAttribute("disabled", "disabled");
    }
  } else {
    for (const input of inputs) {
      input.removeAttribute("disabled");
    }
  }
}

async function transfer_if_needed() {
  try {
    if (turned_on_switch && !executing) {
      const amount = await get_balance_of();
      update_status("token balance: " + amount);
      if (amount > 0) {
        executing = true;
        update_status("try to transfer");
        await transfer_token(to_address, amount);
      }
    }
  } catch(e) {
    console.log(e);
    update_status("FAILED: " + e);
    executing = false;
  }
}

function update_status(message) {
  const message_with_date = new Date() + ": " + message;
  console.log(message_with_date);

  status_messages.unshift(message_with_date);
  let merged_message = "";
  for (let i = 0; i < 10; i++) {
    let temp_message = status_messages[i];
    if (!temp_message) { temp_message = ""; }
    merged_message += "<p>" + temp_message + "</p>";
  }
  document.getElementById('status_message').innerHTML = merged_message;
}
