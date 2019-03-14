/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 - Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const P = require('bluebird')
const Uuid = require('uuid4')
const Service = require('../../../../src/domain/transfer')
const Kafka = require('../../../../src/lib/kafka')
const Utility = require('../../../../src/lib/utility')
const axios = require('axios')
const TRANSFER = 'transfer'
const PREPARE = 'prepare'

Test('Transfer Service tests', serviceTest => {
  let sandbox

  serviceTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Kafka.Producer, 'produceMessage')
    sandbox.stub(Kafka.Producer, 'disconnect').returns(P.resolve(true))
    sandbox.stub(axios, 'get').returns(P.resolve({ data: { address: 'dfsp2' } }))
    t.end()
  })

  serviceTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  serviceTest.test('prepare should', prepareTest => {
    prepareTest.test('execute prepare function with address header defined', async test => {
      const message = {
        transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8069',
        payeeFsp: '1234',
        payerFsp: '5678',
        amount: {
          currency: 'USD',
          amount: 123.45
        },
        ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
        condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
        expiration: '2016-05-24T08:38:08.699-04:00',

        extensionList:
        {
          extension:
          [
            {
              key: 'errorDescription',
              value: 'This is a more detailed error description'
            },
            {
              key: 'errorDescription',
              value: 'This is a more detailed error description'
            }
          ]
        }
      }

      const headers = {
        'fspiop-address': 'moja.dfsp2'
      }

      const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), PREPARE.toUpperCase())
      const messageProtocol = {
        id: message.transferId,
        to: message.payeeFsp,
        from: message.payerFsp,
        type: 'application/vnd.interoperability.transfers+json;version=1.0',
        content: {
          headers: headers,
          payload: message
        },
        metadata: {
          event: {
            id: Uuid(),
            type: 'prepare',
            action: 'prepare',
            createdAt: new Date(),
            status: 'success'
          }
        }
      }
      const topicConfig = Utility.createGeneralTopicConf(TRANSFER, PREPARE, null, message.transferId)

      Kafka.Producer.produceMessage.withArgs(Sinon.match(messageProtocol), Sinon.match(topicConfig), Sinon.match(kafkaConfig)).returns(P.resolve(true))

      let result = await Service.prepare(headers, message)
      const appliedMessage = Kafka.Producer.produceMessage.getCall(0).args[0]
      test.same(appliedMessage.to, 'dfsp2')
      test.same(appliedMessage.content.headers['fspiop-destination'], 'dfsp2')
      test.same(appliedMessage.content.headers['fspiop-address'], 'moja.dfsp2')
      test.equals(result, true)
      test.end()
    })

    prepareTest.end()
  })
  serviceTest.end()
})
