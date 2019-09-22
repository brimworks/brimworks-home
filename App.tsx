import React from 'react';
import { View, StyleSheet, Text, Button, TouchableOpacity } from 'react-native';

import { withAuthenticator, AmplifyTheme } from 'aws-amplify-react-native'

import Amplify from '@aws-amplify/core'
import Auth from '@aws-amplify/auth';
import PubSub from '@aws-amplify/pubsub';
import Analytics from '@aws-amplify/analytics';
import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers';

import config from './aws-exports'

Amplify.configure(config);
Analytics.disable();

Auth.currentCredentials().then((info) => {
    console.log("identity", info._identityId);
});
//Amplify.Logger.LOG_LEVEL = "DEBUG";
Amplify.addPluggable(new AWSIoTProvider({
    aws_pubsub_region: 'us-east-1',
    aws_pubsub_endpoint: 'wss://a34io989fe2obp-ats.iot.us-east-1.amazonaws.com/mqtt',
}));

type State = {
    garageDoorState: string,
    disableGarageDoor: boolean,
    error?: string,
};
type Props = {};
class App extends React.Component<Props, State> {
    private garageDoorSubscription: { unsubscribe: () => void; };
    onGarageDoorState({ value }) {
        this.setState({ garageDoorState: value, error: undefined, disableGarageDoor: false });
    }
    onGarageDoorClick() {
        this.setState({ disableGarageDoor: true });
        PubSub.publish("garageDoor/open", "PLEASE")
            .catch(err => {
                console.log("Failed to publish: ", err);
                this.setState(
                    { error: "Failed to publish: " + err });
            });

    }
    subscribeToGarageDoorState() {
        if (this.garageDoorSubscription) {
            this.garageDoorSubscription.unsubscribe();
            return;
        }
        this.garageDoorSubscription = PubSub.subscribe("garageDoor/state", {
            parseJSON: false,
        }).subscribe({
            next: this.onGarageDoorState.bind(this),
            error: err => {
                console.log("Failed to subscribe: ", err.error);
                this.setState(
                    { error: "Failed to subscribe: " + err.error },
                    this.subscribeToGarageDoorState.bind(this));
            },
            close: this.subscribeToGarageDoorState.bind(this),
        });
        PubSub.publish("garageDoor/get", "PLEASE")
            .catch(err => {
                console.log("Failed to publish: ", err);
                this.setState(
                    { error: "Failed to publish: " + err },
                    this.subscribeToGarageDoorState);
            });
    }
    constructor(props) {
        super(props);
        this.state = {
            garageDoorState: "CONNECTING...",
            disableGarageDoor: true,
        };
        // FIXME: We shouldn't need to set a timeout...
        setTimeout(this.subscribeToGarageDoorState.bind(this), 3000);
    }
    render() {
        const garageDoorButtonStyle = this.state.disableGarageDoor ?
            AmplifyTheme.buttonDisabled : AmplifyTheme.button;
        const onGarageDoorClick = ev => this.onGarageDoorClick();
        return (
            <View style={styles.container}>
                <Text>Garage Door State: {this.state.garageDoorState}</Text>
                <TouchableOpacity onPress={onGarageDoorClick} style={garageDoorButtonStyle}>
                    <Text style={AmplifyTheme.buttonText}>Click</Text>
                </TouchableOpacity>
                { this.state.error ?
                  <Text>Error: {this.state.error}</Text> : [] }
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default withAuthenticator(App, {
    includeGreetings: true
});