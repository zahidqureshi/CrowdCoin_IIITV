const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const compiledFactory = require('../ethereum/build/CampaignFactory.json');
const compiledCampaign = require('../ethereum/build/Campaign.json');

let accounts;
let factory;
let campaignAddress;
let campaign;

beforeEach (async () => {
	accounts = await web3.eth.getAccounts();
	
	factory = await new web3.eth.Contract(JSON.parse(compiledFactory.interface))
		.deploy({data: compiledFactory.bytecode})
		.send({from: accounts[0], gas: '1000000'});
		
	await factory.methods.createCampaign('100').send({
		from: accounts[0],
		gas: '1000000'
	});
	
	[campaignAddress] = await factory.methods.getDeployedCampaigns().call();
	campaign = new web3.eth.Contract (
		JSON.parse(compiledCampaign.interface),
		campaignAddress
	);
});

describe('Campaigns', () => {

  it('processes requests', async () => {
    await campaign.methods.contribute().send({
      from: accounts[0],
      value: web3.utils.toWei('10', 'ether')
    });

    await campaign.methods
      .createRequest('A', web3.utils.toWei('5', 'ether'), accounts[1])
      .send({ from: accounts[0], gas: '1000000'});

    await campaign.methods.approveRequest(0).send({
      from: accounts[0],
      gas: '1000000'
    });

    await campaign.methods.finalizeRequest(0).send({
      from: accounts[0],
      gas: '1000000'
    });

    let balance = await web3.eth.getBalance(accounts[1]);    //balance in string wei
    balance = await web3.utils.fromWei(balance, 'ether');      //balance in string ether
    balance = parseFloat(balance);                           //balance in float ether

    //console.log(balance);
    assert(balance > 104);          //during tests accounts[1] was used to make some transactions,
                                    //which consumed some gas(in wei) from it, and ganache DOESN'T refresh
                                    //the test accounts balance to 100 ether after every npm run test
  });
  
  it('requires a minimum contribution', async () =>{
		try{
			   await campaign.methods.contribute().send({
				value: '5',
				from: accounts[1]
			});
			assert(false);
		  }catch(err){
			assert(err);
	    	}		
	});
	
	it('allows a manager to make a payment request', async ()=> {
		await campaign.methods
			.createRequest( 'buy batteries','100',accounts[1])
			.send({
				from: accounts[0],
				gas: '1000000'
			    });
		const request = await campaign.methods.requests(0).call();
		
		assert.equal('buy batteries', request.description);
	});
  
  
});