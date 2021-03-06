import React, { PureComponent } from 'react';
import { connectSettings } from 'core';
import { find } from 'lodash';

import Address from 'components/Address/Address';

class NEOAddress extends PureComponent {
  state = {
    address: undefined,
    balance: undefined,
    totalTxns: undefined,
    txnHistory: [],
    tokenBalances: undefined,
    isLoadingBalance: false,
    isLoadingTxns: false,
    hasMoreTxns: false
  };

  componentDidMount() {
    this._isMounted = true;

    const { apiObject, currency, address } = this.props;

    if (address) {                            
      this.getAddressInfo(apiObject, currency, address);
      this.getAddressTxns(apiObject, currency, address); 
    }
  }

  componentWillReceiveProps({ apiObject, currency, address }) {
    if (address && this.props.address !== address) {
      this.setState({
        totalTxns: undefined,
        txnHistory: []
      }, () => {
        this.getAddressInfo(apiObject, currency, address);
        this.getAddressTxns(apiObject, currency, address); 
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  getAddressInfo (apiObject, currency, address) {
    this.setState({
      address,
      balance: undefined,
      tokenBalances: undefined,
      isLoadingBalance: true
    });

    apiObject.get(`/balance/${address}`)
      .then(res => {
        if (res.data.status !== 200)
          return;

        let tokenBalances = res.data.data.balance;

        tokenBalances = tokenBalances.map(({ ticker, value, asset }) =>({
          symbol: ticker,
          balance: value,
          asset: asset
        }));

        const balanceObj = find(tokenBalances, { symbol: currency });
        
        if (this._isMounted)
          this.setState({
            balance: balanceObj ? balanceObj.balance : 0,
            tokenBalances
          });
      })
      .finally(() => {
        if (this._isMounted)
          this.setState({ isLoadingBalance: false })
      });
  }

  getAddressTxns (apiObject, currency, address) {
    
    const { txnHistory } = this.state;

    this.setState({
      isLoadingTxns: true
    });

    apiObject.get(`/address/txs/${address}`, {
      params: {
        offset: txnHistory.length
      }
    })
      .then(res => {
        if (res.data.status !== 200)
          return;

        let { total: totalTxns, result: newTxns } = res.data.data;
        
        newTxns = newTxns.map(txn => {
          let value = 0;

          txn.vin.forEach( vin => {
            if (vin.address && (vin.address.address === address))
              value -= (+vin.address.value);
          });

          txn.vout.forEach( vout => {
            if (vout.address && (vout.address === address))
              value += (+vout.value);
          });
          
          return {
            hash: txn.txid,
            blockHash: txn.blockhash,
            timestamp: txn.blocktime,
            value: value
          }
        });
        
        const hasMoreTxns = newTxns.length < 10 ? false : true;

        if (this._isMounted)
          this.setState({
            hasMoreTxns,
            totalTxns, 
            txnHistory: txnHistory.concat(newTxns)
          });
      })
      .finally(() => {
        if (this._isMounted) 
          this.setState({ isLoadingTxns: false });
      });
  }

  handleViewMore = () => {
    const { apiObject, currency, address } = this.props;

    if (address) {
      this.getAddressTxns(apiObject, currency, address);    
    }
  }

  render () {
    const { currency } = this.props;
    const { address, balance, txnHistory, totalTxns, tokenBalances, isLoadingBalance, isLoadingTxns, hasMoreTxns } = this.state;
    return (
      <Address
        currency={currency}
        address={address}
        balance={balance}
        txnHistory={txnHistory}
        totalTxns={totalTxns}
        tokenBalances={tokenBalances}
        isLoadingBalance={isLoadingBalance}
        isLoadingTxns={isLoadingTxns}
        hasMoreTxns={hasMoreTxns}
        onViewMore={this.handleViewMore}
      />
    );
  }
}

const mapStateToProps = ({settings}) => ({
  currency: settings.currency,
  apiObject: settings.apiObject
});


export default connectSettings(mapStateToProps, {})(NEOAddress);